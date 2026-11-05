"""Add language settings: the language of each analysis's AI-written text and the user's preferred language.

Existing analyses were all generated in English and existing users used the English default, so the
server default fills both columns with 'en'.

Revision ID: b8e5d2a7c4f1
Revises: 7c2f4a91d3b5
Create Date: 2026-10-27 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8e5d2a7c4f1'
down_revision: str | Sequence[str] | None = '7c2f4a91d3b5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'analyses',
        sa.Column('output_language', sa.String(length=8), server_default='en', nullable=False),
    )
    op.add_column(
        'users',
        sa.Column('preferred_language', sa.String(length=8), server_default='en', nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'preferred_language')
    op.drop_column('analyses', 'output_language')
