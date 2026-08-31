import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ItemBase(BaseModel):
    name: str
    unit: str
    category: str | None = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    category: str | None = None


class ItemRead(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
