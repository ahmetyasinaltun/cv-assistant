# Registration and login use cases: validates credentials and issues access tokens.

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def register(self, payload: RegisterRequest) -> TokenResponse:
        email = payload.email.lower()
        if self.users.get_by_email(email) is not None:
            raise ConflictError("An account with this email already exists.", code="email_taken")
        user = User(
            email=email,
            full_name=payload.full_name.strip(),
            password_hash=hash_password(payload.password),
        )
        self.users.add(user)
        return self._token_for(user)

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.users.get_by_email(payload.email.lower())
        # Same error for unknown email and wrong password so the endpoint does not leak which emails exist.
        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.", code="invalid_credentials")
        return self._token_for(user)

    @staticmethod
    def _token_for(user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user.id), user=UserResponse.model_validate(user)
        )
