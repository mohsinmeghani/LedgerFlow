import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.item import Item
from app.models.item_category import ItemCategory
from app.schemas.item import ItemCreate, ItemRead, ItemUpdate

router = APIRouter(
    prefix="/api/v1/items",
    tags=["items"],
    dependencies=[Depends(get_current_user)],
)


def _get_item_or_404(db: Session, item_id: uuid.UUID) -> Item:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _check_category_exists(db: Session, category_id: uuid.UUID | None) -> None:
    if category_id is None:
        return
    if db.get(ItemCategory, category_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown category_id",
        )


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)) -> Item:
    _check_category_exists(db, payload.category_id)
    item = Item(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[ItemRead])
def list_items(db: Session = Depends(get_db)) -> list[Item]:
    return db.query(Item).order_by(Item.name).all()


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: uuid.UUID, db: Session = Depends(get_db)) -> Item:
    return _get_item_or_404(db, item_id)


@router.put("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: uuid.UUID, payload: ItemUpdate, db: Session = Depends(get_db)
) -> Item:
    item = _get_item_or_404(db, item_id)
    changes = payload.model_dump(exclude_unset=True)
    if "category_id" in changes:
        _check_category_exists(db, changes["category_id"])
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
