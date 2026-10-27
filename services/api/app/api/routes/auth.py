# HTTP routes for registration, login and reading or updating the authenticated user profile.

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPreferencesUpdate,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    return AuthService(db).register(payload)


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
