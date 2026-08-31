from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class ItemCategory(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "item_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
