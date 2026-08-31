import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ItemCategoryCreate(BaseModel):
    name: str


class ItemCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime
