import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class Purchase(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "purchases"
    __table_args__ = (
        UniqueConstraint("supplier_id", "invoice_no", name="uq_purchase_supplier_invoice_no"),
    )

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False
    )
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    invoice_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    supplier = relationship("Supplier", backref="purchases")
    line_items = relationship(
        "PurchaseLineItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
        order_by="PurchaseLineItem.line_no",
    )
    allocations = relationship("PaymentAllocation", back_populates="purchase")
