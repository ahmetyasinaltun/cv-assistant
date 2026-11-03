"""Add tailoring to cv_documents: the analysis a CV was written for, the mode, and strict mode's questions.

Revision ID: d7e2b9c4a1f8
Revises: c3a9f1d6e2b7
Create Date: 2026-11-02 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d7e2b9c4a1f8"
down_revision: str | Sequence[str] | None = "c3a9f1d6e2b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Batch mode rebuilds the table on SQLite, which cannot add a foreign key to an existing table.
    with op.batch_alter_table("cv_documents") as batch:
        batch.add_column(sa.Column("analysis_id", sa.Uuid(), nullable=True))
        batch.add_column(sa.Column("tailoring_mode", sa.String(length=16), nullable=True))
        batch.add_column(sa.Column("questions", sa.JSON(), nullable=True))
        batch.create_foreign_key(
            "fk_cv_documents_analysis_id_analyses",
            "analyses",
            ["analysis_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("cv_documents") as batch:
        batch.drop_constraint("fk_cv_documents_analysis_id_analyses", type_="foreignkey")
        batch.drop_column("questions")
        batch.drop_column("tailoring_mode")
        batch.drop_column("analysis_id")
