"""Add cv_documents: editable CVs with their structured content, language and print template.

Revision ID: c3a9f1d6e2b7
Revises: b8e5d2a7c4f1
Create Date: 2026-11-02 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3a9f1d6e2b7"
down_revision: str | Sequence[str] | None = "b8e5d2a7c4f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "cv_documents",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("resume_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=False),
        sa.Column("template", sa.String(length=32), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cv_documents_user_id"), "cv_documents", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_cv_documents_user_id"), table_name="cv_documents")
    op.drop_table("cv_documents")
