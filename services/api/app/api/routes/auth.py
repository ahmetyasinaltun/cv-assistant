# HTTP routes for registration, login, email verification and reading or updating the authenticated user profile.

from fastapi import APIRouter, status

from app.api.deps import AddressKey, CurrentUser, DbSession, Sender
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPreferencesUpdate,
    UserResponse,
    VerificationCodeSent,
    VerificationConfirmRequest,
)
from app.services.auth_service import AuthService
from app.services.email_verification_service import EmailVerificationService
from app.services.user_service import UserService

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest, db: DbSession, address_key: AddressKey, sender: Sender
) -> TokenResponse:
    return AuthService(db).register(payload, address_key, sender)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).login(payload)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    payload: UserPreferencesUpdate, current_user: CurrentUser, db: DbSession
) -> UserResponse:
    return UserResponse.model_validate(UserService(db).update_preferences(current_user, payload))


@router.post(
    "/me/email-verification",
    response_model=VerificationCodeSent,
    status_code=status.HTTP_202_ACCEPTED,
)
def send_verification_code(
    current_user: CurrentUser, db: DbSession, address_key: AddressKey, sender: Sender
) -> VerificationCodeSent:
    """Emails a new code; the earlier one stops working."""
    EmailVerificationService(db, sender).send_code(current_user, address_key)
    return VerificationCodeSent(sent_to=current_user.email)


@router.post("/me/email-verification/confirm", response_model=UserResponse)
def confirm_email(
    payload: VerificationConfirmRequest, current_user: CurrentUser, db: DbSession, sender: Sender
) -> UserResponse:
    user = EmailVerificationService(db, sender).confirm(current_user, payload.code)
    return UserResponse.model_validate(user)
