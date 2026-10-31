# Registration and login use cases: validates credentials and issues access tokens.

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, UnauthorizedError, ValidationFailedError
from app.core.rate_limit import LOGIN_FAILURES
from app.core.security import (
    MAX_PASSWORD_BYTES,
    create_access_token,
    hash_password,
    password_fits,
    spend_password_check_time,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def register(self, payload: RegisterRequest) -> TokenResponse:
        email = payload.email.lower()
        if not password_fits(payload.password):
            raise ValidationFailedError(
                f"Passwords can be at most {MAX_PASSWORD_BYTES} bytes long.",
                code="password_too_long",
            )
        if self.users.get_by_email(email) is not None:
            raise ConflictError("An account with this email already exists.", code="email_taken")
        user = User(
            email=email,
            full_name=payload.full_name.strip(),
            password_hash=hash_password(payload.password),
            preferred_language=payload.preferred_language,
        )
        self.users.add(user)
        return self._token_for(user)

    def login(self, payload: LoginRequest) -> TokenResponse:
        email = payload.email.lower()
        # Counted per email, so guessing one account's password is slowed wherever the guesses come from.
        LOGIN_FAILURES.check(email)
        user = self.users.get_by_email(email)
        # Same error and about the same time for an unknown email and a wrong password, so the endpoint does
        # not leak which emails exist.
        if user is None:
            spend_password_check_time(payload.password)
        if user is None or not verify_password(payload.password, user.password_hash):
            LOGIN_FAILURES.record(email)
            raise UnauthorizedError("Invalid email or password.", code="invalid_credentials")
        return self._token_for(user)

    @staticmethod
    def _token_for(user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user.id), user=UserResponse.model_validate(user)
        )
