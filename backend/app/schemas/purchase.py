import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PurchaseLineItemCreate(BaseModel):
    item_id: uuid.UUID
    quantity: Decimal = Field(gt=0)
    rate: Decimal = Field(ge=0)


class PurchaseLineItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item_id: uuid.UUID
    quantity: Decimal
    rate: Decimal
    amount: Decimal


class PurchaseCreate(BaseModel):
    supplier_id: uuid.UUID
    purchase_date: date
    invoice_no: str | None = None
    line_items: list[PurchaseLineItemCreate]

    @field_validator("line_items")
    @classmethod
    def must_have_at_least_one_line_item(
        cls, value: list[PurchaseLineItemCreate]
    ) -> list[PurchaseLineItemCreate]:
        if not value:
            raise ValueError("A purchase must have at least one line item")
        return value


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    supplier_id: uuid.UUID
    purchase_date: date
    invoice_no: str | None
    total_amount: Decimal
    line_items: list[PurchaseLineItemRead]
    created_at: datetime
    updated_at: datetime


PurchaseStatus = Literal["unpaid", "partially_paid", "paid"]


class PurchaseWithBalance(PurchaseRead):
    amount_paid: Decimal
    balance: Decimal
    status: PurchaseStatus
