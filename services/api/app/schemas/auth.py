# Request/response schemas for registration, login and the current-user endpoint.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import DEFAULT_LANGUAGE, Language, ORMModel


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    # Clients send the interface language the visitor registered in.
    preferred_language: Language = DEFAULT_LANGUAGE


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str
    preferred_language: Language
    created_at: datetime


class UserPreferencesUpdate(BaseModel):
    preferred_language: Language


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
