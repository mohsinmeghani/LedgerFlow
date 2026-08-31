import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    name: str
    contact: str | None = None
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact: str | None = None
    address: str | None = None
    is_active: bool | None = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
