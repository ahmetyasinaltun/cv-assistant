# Account settings use cases for the signed-in user (currently the preferred language).

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserPreferencesUpdate


class UserService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def update_preferences(self, user: User, payload: UserPreferencesUpdate) -> User:
        user.preferred_language = payload.preferred_language
        return self.users.save(user)
