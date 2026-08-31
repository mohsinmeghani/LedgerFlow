from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.item_category import ItemCategory
from app.schemas.item_category import ItemCategoryCreate, ItemCategoryRead

router = APIRouter(
    prefix="/api/v1/item-categories",
    tags=["item-categories"],
    dependencies=[Depends(get_current_user)],
)


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
