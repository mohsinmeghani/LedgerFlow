import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate

router = APIRouter(
    prefix="/api/v1/suppliers",
    tags=["suppliers"],
    dependencies=[Depends(get_current_user)],
)


def _get_supplier_or_404(db: Session, supplier_id: uuid.UUID) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)) -> Supplier:
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("", response_model=list[SupplierRead])
def list_suppliers(
    include_inactive: bool = False, db: Session = Depends(get_db)
) -> list[Supplier]:
    query = db.query(Supplier)
    if not include_inactive:
        query = query.filter(Supplier.is_active.is_(True))
    return query.order_by(Supplier.name).all()


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: uuid.UUID, db: Session = Depends(get_db)) -> Supplier:
    return _get_supplier_or_404(db, supplier_id)


@router.put("/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: uuid.UUID, payload: SupplierUpdate, db: Session = Depends(get_db)
) -> Supplier:
    supplier = _get_supplier_or_404(db, supplier_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    supplier = _get_supplier_or_404(db, supplier_id)
    supplier.is_active = False
    db.commit()
