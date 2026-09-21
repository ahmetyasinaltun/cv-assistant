# Shared Pydantic base classes and small response models reused across API schemas.

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base for response schemas that are populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str
