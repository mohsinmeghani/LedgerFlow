"""add item_categories master table

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "item_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("name", name="uq_item_categories_name"),
    )

    op.add_column("items", sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_items_category_id", "items", "item_categories", ["category_id"], ["id"]
    )

    # Backfill: turn each distinct existing free-text category into a row,
    # then point items at it.
    op.execute(
        """
        INSERT INTO item_categories (id, name, created_at, updated_at)
        SELECT gen_random_uuid(), distinct_categories.category, now(), now()
        FROM (
            SELECT DISTINCT category FROM items
            WHERE category IS NOT NULL AND category <> ''
        ) AS distinct_categories
        """
    )
    op.execute(
        """
        UPDATE items
        SET category_id = item_categories.id
        FROM item_categories
        WHERE items.category = item_categories.name
        """
    )

    op.drop_column("items", "category")


def downgrade() -> None:
    op.add_column("items", sa.Column("category", sa.String(length=100), nullable=True))
    op.execute(
        """
        UPDATE items
        SET category = item_categories.name
        FROM item_categories
        WHERE items.category_id = item_categories.id
        """
    )
    op.drop_constraint("fk_items_category_id", "items", type_="foreignkey")
    op.drop_column("items", "category_id")
    op.drop_table("item_categories")
