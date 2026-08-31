import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class SupplierBalanceSummary(BaseModel):
    supplier_id: uuid.UUID
    supplier_name: str
    outstanding_balance: Decimal


class RecentActivityItem(BaseModel):
    type: Literal["purchase", "payment"]
    id: uuid.UUID
    date: date
    supplier_id: uuid.UUID
    supplier_name: str
    amount: Decimal
    reference: str | None


class DashboardResponse(BaseModel):
    total_outstanding: Decimal
    suppliers_by_outstanding: list[SupplierBalanceSummary]
    recent_activity: list[RecentActivityItem]
