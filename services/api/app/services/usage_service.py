# Daily limits counted in the database: the service-wide AI budget, and per-address limits on registrations, AI
# actions and verification emails. Unlike the in-memory limits in app.core.rate_limit, these survive the free
# instance going to sleep and restarting.

import math
import uuid
from datetime import datetime, timedelta
from enum import StrEnum

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import TooManyRequestsError
from app.db.base import utc_now
from app.models.usage_event import UsageEvent

DAY = timedelta(days=1)
HOUR = timedelta(hours=1)
# Events older than this are never counted again, so they are deleted as new ones arrive.
KEEP_EVENTS_FOR = timedelta(days=2)

VERIFICATION_EMAIL_GAP = timedelta(seconds=60)
VERIFICATION_EMAILS_PER_HOUR = 5
ADDRESS_DAILY_VERIFICATION_EMAILS = 20


class UsageKind(StrEnum):
    ANALYSIS = "analysis"
    INTERVIEW_QUESTIONS = "interview_questions"
    CV_AI_WRITE = "cv_ai_write"
    REGISTRATION = "registration"
    VERIFICATION_EMAIL = "verification_email"


AI_KINDS = (UsageKind.ANALYSIS, UsageKind.INTERVIEW_QUESTIONS, UsageKind.CV_AI_WRITE)


class UsageService:
    def __init__(self, db: Session, settings: Settings | None = None):
        self.db = db
        self.settings = settings or get_settings()

    def check_ai_action(self, address_key: str | None) -> None:
        """Raises before an AI action when the service's daily budget or this address's share is used up."""
        since = utc_now() - DAY
        oldest = self._oldest_if_full(
            since, self.settings.ai_daily_budget, UsageEvent.kind.in_(AI_KINDS)
        )
        if oldest is not None:
            raise TooManyRequestsError(
                "The service has used today's AI budget. Try again tomorrow.",
                retry_after_seconds=_seconds_until(oldest + DAY),
                code="daily_budget_reached",
            )
        if address_key is None:
            return
        oldest = self._oldest_if_full(
            since,
            self.settings.address_daily_ai_actions,
            UsageEvent.kind.in_(AI_KINDS),
            UsageEvent.address_key == address_key,
        )
        if oldest is not None:
            raise TooManyRequestsError(
                "Too many AI actions from this network today.",
                retry_after_seconds=_seconds_until(oldest + DAY),
            )

    def check_registration(self, address_key: str | None) -> None:
        if address_key is None:
            return
        oldest = self._oldest_if_full(
            utc_now() - DAY,
            self.settings.address_daily_registrations,
            UsageEvent.kind == UsageKind.REGISTRATION,
            UsageEvent.address_key == address_key,
        )
        if oldest is not None:
            raise TooManyRequestsError(
                "Too many accounts were created from this network today.",
                retry_after_seconds=_seconds_until(oldest + DAY),
            )

    def check_verification_email(self, user_id: uuid.UUID, address_key: str | None) -> None:
        """One code a minute and five an hour per account, twenty a day per address, so the endpoint cannot be
        used to flood an inbox."""
        now = utc_now()
        is_code = UsageEvent.kind == UsageKind.VERIFICATION_EMAIL
        latest = self.db.scalar(
            select(func.max(UsageEvent.created_at)).where(is_code, UsageEvent.user_id == user_id)
        )
        if latest is not None and as_utc(latest) > now - VERIFICATION_EMAIL_GAP:
            raise TooManyRequestsError(
                "A code was sent less than a minute ago.",
                retry_after_seconds=_seconds_until(as_utc(latest) + VERIFICATION_EMAIL_GAP),
            )
        oldest = self._oldest_if_full(
            now - HOUR, VERIFICATION_EMAILS_PER_HOUR, is_code, UsageEvent.user_id == user_id
        )
        if oldest is not None:
            raise TooManyRequestsError(
                "Too many codes were sent in the last hour.",
                retry_after_seconds=_seconds_until(oldest + HOUR),
            )
        if address_key is not None:
            oldest = self._oldest_if_full(
                now - DAY,
                ADDRESS_DAILY_VERIFICATION_EMAILS,
                is_code,
                UsageEvent.address_key == address_key,
            )
            if oldest is not None:
                raise TooManyRequestsError(
                    "Too many codes were sent to this network today.",
                    retry_after_seconds=_seconds_until(oldest + DAY),
                )

    def record(self, kind: UsageKind, user_id: uuid.UUID | None, address_key: str | None) -> None:
        self.db.execute(
            delete(UsageEvent).where(UsageEvent.created_at < utc_now() - KEEP_EVENTS_FOR)
        )
        self.db.add(UsageEvent(kind=kind.value, user_id=user_id, address_key=address_key))
        self.db.commit()

    def _oldest_if_full(self, since: datetime, limit: int, *conditions) -> datetime | None:
        """The oldest counted event when `limit` events match in the window, else None."""
        where = (UsageEvent.created_at >= since, *conditions)
        count = self.db.scalar(select(func.count()).select_from(UsageEvent).where(*where))
        if not count or count < limit:
            return None
        return as_utc(self.db.scalar(select(func.min(UsageEvent.created_at)).where(*where)))


def as_utc(moment: datetime) -> datetime:
    """SQLite hands timestamps back without a zone; every timestamp here is written in UTC."""
    return moment if moment.tzinfo else moment.replace(tzinfo=utc_now().tzinfo)


def _seconds_until(moment: datetime) -> int:
    return max(math.ceil((moment - utc_now()).total_seconds()), 1)
