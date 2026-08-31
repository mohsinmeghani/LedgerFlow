import uuid

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import UUIDPKMixin


class PaymentAllocation(UUIDPKMixin, Base):
    __tablename__ = "payment_allocations"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False
    )
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("purchases.id"), nullable=False
    )
    allocated_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    payment = relationship("Payment", back_populates="allocations")
    purchase = relationship("Purchase", back_populates="allocations")
