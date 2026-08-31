import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentAllocationCreate(BaseModel):
    purchase_id: uuid.UUID
    allocated_amount: Decimal = Field(gt=0)


class PaymentAllocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    purchase_id: uuid.UUID
    allocated_amount: Decimal


class PaymentCreate(BaseModel):
    supplier_id: uuid.UUID
    payment_date: date
    amount: Decimal = Field(gt=0)
    method: str
    notes: str | None = None
    allocations: list[PaymentAllocationCreate] = []


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    supplier_id: uuid.UUID
    payment_date: date
    amount: Decimal
    method: str
    notes: str | None
    allocations: list[PaymentAllocationRead]
    created_at: datetime
