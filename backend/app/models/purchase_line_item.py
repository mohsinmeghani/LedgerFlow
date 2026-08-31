import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import UUIDPKMixin


class PurchaseLineItem(UUIDPKMixin, Base):
    __tablename__ = "purchase_line_items"

    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("purchases.id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id"), nullable=False
    )
    # Entry order within the purchase — UUID primary keys are random, so they
    # can't be used to reconstruct the order the user entered line items in.
    line_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    purchase = relationship("Purchase", back_populates="line_items")
    item = relationship("Item")
