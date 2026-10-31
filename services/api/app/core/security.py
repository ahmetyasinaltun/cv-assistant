# Password hashing and JWT access-token creation/verification used by the authentication flow.

from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
import jwt

from app.core.config import get_settings

# bcrypt reads at most 72 bytes, and the bcrypt package refuses longer input instead of cutting it. A Turkish
# letter such as "ş" takes two bytes, so this is not the same as 72 characters.
MAX_PASSWORD_BYTES = 72


def password_fits(plain_password: str) -> bool:
    return len(plain_password.encode("utf-8")) <= MAX_PASSWORD_BYTES


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    # Registration refuses longer passwords, so no stored hash can match one.
    if not password_fits(plain_password):
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


# Checked when the email is unknown, so a failed sign-in takes as long either way and its timing does not tell
# which emails have an account.
_UNUSED_HASH = hash_password("timing-equalizer-for-unknown-accounts")


def spend_password_check_time(plain_password: str) -> None:
    verify_password(plain_password, _UNUSED_HASH)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> UUID | None:
    """Return the user id embedded in a valid token, or None if the token is invalid/expired."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
