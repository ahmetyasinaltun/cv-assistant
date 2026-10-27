# Shared Pydantic base classes and small response models reused across API schemas.

from typing import Literal

from pydantic import BaseModel, ConfigDict

# Languages the product works in: the interface, the account preference and AI-written text.
# Requirement wording and CV quotes always stay in the language of their source document.
Language = Literal["en", "tr"]
DEFAULT_LANGUAGE: Language = "en"


class ORMModel(BaseModel):
    """Base for response schemas that are populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
