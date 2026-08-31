import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.item import Item
from app.models.item_category import ItemCategory
from app.schemas.item_category import ItemCategoryCreate, ItemCategoryRead

router = APIRouter(
    prefix="/api/v1/item-categories",
    tags=["item-categories"],
    dependencies=[Depends(get_current_user)],
)


def _get_item_category_or_404(db: Session, category_id: uuid.UUID) -> ItemCategory:
    category = db.get(ItemCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.post("", response_model=ItemCategoryRead, status_code=status.HTTP_201_CREATED)
def create_item_category(
    payload: ItemCategoryCreate, db: Session = Depends(get_db)
) -> ItemCategory:
    existing = db.query(ItemCategory).filter(ItemCategory.name == payload.name).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        )
    category = ItemCategory(name=payload.name)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        ) from exc
    db.refresh(category)
    return category


@router.get("", response_model=list[ItemCategoryRead])
def list_item_categories(db: Session = Depends(get_db)) -> list[ItemCategory]:
    return db.query(ItemCategory).order_by(ItemCategory.name).all()


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_category(category_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    category = _get_item_category_or_404(db, category_id)

    in_use = db.query(Item.id).filter(Item.category_id == category_id).first() is not None
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This category is used by the items module and cannot be deleted.",
        )

    db.delete(category)
    db.commit()
