"""Add a machine-readable error code to failed analyses.

Revision ID: 7c2f4a91d3b5
Revises: e41cda0029d0
Create Date: 2026-10-25 20:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7c2f4a91d3b5'
down_revision: str | Sequence[str] | None = 'e41cda0029d0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('analyses', sa.Column('error_code', sa.String(length=64), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('analyses', 'error_code')
