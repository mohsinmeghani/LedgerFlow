import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class LedgerEntry(BaseModel):
    type: Literal["purchase", "payment"]
    id: uuid.UUID
    date: date
    reference: str | None
    debit: Decimal
    credit: Decimal
    running_balance: Decimal


class SupplierLedgerResponse(BaseModel):
    supplier_id: uuid.UUID
    supplier_name: str
    from_date: date | None
    to_date: date | None
    opening_balance: Decimal
    closing_balance: Decimal
    current_outstanding_balance: Decimal
    entries: list[LedgerEntry]
