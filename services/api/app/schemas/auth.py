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
    # AI actions (analyses, interview questions, AI-written CVs) wait until this is true.
    email_verified: bool
    created_at: datetime


class VerificationConfirmRequest(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class VerificationCodeSent(BaseModel):
    sent_to: EmailStr


class UserPreferencesUpdate(BaseModel):
    preferred_language: Language


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
