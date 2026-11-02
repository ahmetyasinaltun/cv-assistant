# In-memory sliding-window limits for the actions that cost something: sign-in attempts (guessing passwords), AI calls
# (the free Gemini quota is shared by every user) and page fetches. The counts live in this one API process and
# reset when it restarts, which is enough for a single free-tier instance; several instances would need a shared
# store such as Redis.

import math
import threading
import time
from collections import deque
from collections.abc import Callable

from app.core.errors import TooManyRequestsError


class SlidingWindowLimiter:
    """Allows `limit` events per key within any `window_seconds`; thread-safe, as sync routes run in a pool."""

    def __init__(
        self,
        limit: int,
        window_seconds: float,
        *,
        message: str,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.limit = limit
        self.window_seconds = window_seconds
        self.message = message
        self._clock = clock
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        """Raises when the key has used up its window, without counting this call."""
        with self._lock:
            self._refuse_if_full(key, self._clock())

    def record(self, key: str) -> None:
        with self._lock:
            self._events.setdefault(key, deque()).append(self._clock())

    def hit(self, key: str) -> None:
        """Counts this call, or raises when the key has used up its window."""
        with self._lock:
            now = self._clock()
            self._refuse_if_full(key, now)
            self._events.setdefault(key, deque()).append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()

    def _refuse_if_full(self, key: str, now: float) -> None:
        events = self._events.get(key)
        if events is None:
            return
        while events and now - events[0] >= self.window_seconds:
            events.popleft()
        if not events:
            del self._events[key]
            return
        if len(events) >= self.limit:
            retry_after = math.ceil(self.window_seconds - (now - events[0]))
            raise TooManyRequestsError(self.message, retry_after_seconds=max(retry_after, 1))


DAY = 24 * 60 * 60

# Failed sign-ins per email: slows password guessing without locking anyone out for long.
LOGIN_FAILURES = SlidingWindowLimiter(
    10, 15 * 60, message="Too many failed sign-in attempts. Try again in a few minutes."
)
# Each analysis costs four model calls and an embedding call from the shared free quota.
ANALYSES = SlidingWindowLimiter(20, DAY, message="The daily limit of analyses is reached.")
INTERVIEW_QUESTIONS = SlidingWindowLimiter(
    20, DAY, message="The daily limit of interview questions is reached."
)
LINK_IMPORTS = SlidingWindowLimiter(30, 60 * 60, message="Too many links read in the last hour.")
# A render takes tens of milliseconds of CPU; the cap only stops a script from hogging the free instance.
CV_RENDERS = SlidingWindowLimiter(200, 60 * 60, message="Too many CV previews in the last hour.")
# Structuring a saved CV (and, later, tailoring one) costs model calls from the shared free quota.
CV_AI_WRITES = SlidingWindowLimiter(
    10, DAY, message="The daily limit of AI-written CVs is reached."
)

ALL_LIMITERS = (
    LOGIN_FAILURES,
    ANALYSES,
    INTERVIEW_QUESTIONS,
    LINK_IMPORTS,
    CV_RENDERS,
    CV_AI_WRITES,
)
