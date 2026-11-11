# FastAPI dependencies shared by routes: database session, the authenticated (and verified) current user, the
# caller's address key for per-address limits, and the email sender.

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.client_address import address_key, client_address
from app.core.config import get_settings
from app.core.email import EmailSender, get_email_sender
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise UnauthorizedError("Authentication required.", code="missing_token")
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise UnauthorizedError("Invalid or expired token.", code="invalid_token")
    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise UnauthorizedError("User no longer exists.", code="user_not_found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_verified_user(current_user: CurrentUser) -> User:
    """For actions that spend the shared AI quota: they wait until the account's email address is verified."""
    if not current_user.email_verified:
        raise ForbiddenError("Verify your email address first.", code="email_not_verified")
    return current_user


VerifiedUser = Annotated[User, Depends(get_verified_user)]


def get_address_key(request: Request) -> str | None:
    settings = get_settings()
    return address_key(client_address(request, settings), settings)


AddressKey = Annotated[str | None, Depends(get_address_key)]
Sender = Annotated[EmailSender, Depends(get_email_sender)]
