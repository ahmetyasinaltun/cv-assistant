"""Add email verification to users and usage_events for daily limits that survive restarts.

Accounts that exist before this change count as verified, so nobody who already uses the service is locked out.

Revision ID: e5b1c8d2f4a6
Revises: d7e2b9c4a1f8
Create Date: 2026-11-11 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5b1c8d2f4a6"
down_revision: str | Sequence[str] | None = "d7e2b9c4a1f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("verification_code_hash", sa.String(length=64), nullable=True))
        batch.add_column(
            sa.Column("verification_code_expires_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.add_column(
            sa.Column("verification_attempts", sa.Integer(), nullable=False, server_default="0")
        )
    op.execute("UPDATE users SET email_verified_at = created_at")

    op.create_table(
        "usage_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("address_key", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_events_kind_created_at", "usage_events", ["kind", "created_at"])
    op.create_index(
        "ix_usage_events_address_key_created_at", "usage_events", ["address_key", "created_at"]
    )
    op.create_index("ix_usage_events_user_id_created_at", "usage_events", ["user_id", "created_at"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_usage_events_user_id_created_at", table_name="usage_events")
    op.drop_index("ix_usage_events_address_key_created_at", table_name="usage_events")
    op.drop_index("ix_usage_events_kind_created_at", table_name="usage_events")
    op.drop_table("usage_events")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("verification_attempts")
        batch.drop_column("verification_code_expires_at")
        batch.drop_column("verification_code_hash")
        batch.drop_column("email_verified_at")
