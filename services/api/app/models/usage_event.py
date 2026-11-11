# ORM model for counted actions (AI calls, registrations, verification emails), so daily limits survive restarts.

import uuid

from sqlalchemy import ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UsageEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "usage_events"
    __table_args__ = (
        Index("ix_usage_events_kind_created_at", "kind", "created_at"),
        Index("ix_usage_events_address_key_created_at", "address_key", "created_at"),
        Index("ix_usage_events_user_id_created_at", "user_id", "created_at"),
    )

    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    # A keyed hash of the network address (app.core.client_address), never the address itself.
    address_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
