import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.item import Item
from app.models.payment_allocation import PaymentAllocation
from app.models.purchase import Purchase
from app.models.purchase_line_item import PurchaseLineItem
from app.models.supplier import Supplier
from app.schemas.purchase import PurchaseCreate, PurchaseRead, PurchaseWithBalance
from app.services.balances import (
    build_purchase_with_balance,
    get_amount_paid_for_purchase,
    get_amounts_paid_by_purchase,
)

router = APIRouter(
    prefix="/api/v1/purchases",
    tags=["purchases"],
    dependencies=[Depends(get_current_user)],
)


def _get_purchase_or_404(db: Session, purchase_id: uuid.UUID) -> Purchase:
    purchase = (
        db.query(Purchase)
        .options(joinedload(Purchase.line_items))
        .filter(Purchase.id == purchase_id)
        .first()
    )
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    return purchase


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(payload: PurchaseCreate, db: Session = Depends(get_db)) -> Purchase:
    supplier = db.get(Supplier, payload.supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    item_ids = {li.item_id for li in payload.line_items}
    found_ids = {row[0] for row in db.query(Item.id).filter(Item.id.in_(item_ids)).all()}
    missing = item_ids - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown item id(s): {', '.join(str(i) for i in missing)}",
        )

    if payload.invoice_no:
        existing = (
            db.query(Purchase)
            .filter(
                Purchase.supplier_id == payload.supplier_id,
                Purchase.invoice_no == payload.invoice_no,
            )
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A purchase with this invoice number already exists for this supplier",
            )

    purchase = Purchase(
        supplier_id=payload.supplier_id,
        purchase_date=payload.purchase_date,
        invoice_no=payload.invoice_no,
        total_amount=Decimal("0"),
    )

    total = Decimal("0")
    for line_no, line in enumerate(payload.line_items):
        amount = (line.quantity * line.rate).quantize(Decimal("0.01"))
        total += amount
        purchase.line_items.append(
            PurchaseLineItem(
                item_id=line.item_id,
                line_no=line_no,
                quantity=line.quantity,
                rate=line.rate,
                amount=amount,
            )
        )
    purchase.total_amount = total

    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.get("", response_model=list[PurchaseWithBalance])
def list_purchases(
    supplier_id: uuid.UUID | None = None,
    outstanding_only: bool = False,
    db: Session = Depends(get_db),
) -> list[dict]:
    query = db.query(Purchase).options(joinedload(Purchase.line_items))
    if supplier_id is not None:
        query = query.filter(Purchase.supplier_id == supplier_id)
    purchases = query.order_by(Purchase.purchase_date.desc(), Purchase.created_at.desc()).all()

    amounts_paid = get_amounts_paid_by_purchase(db, [p.id for p in purchases])
    results = []
    for purchase in purchases:
        paid = amounts_paid.get(purchase.id, Decimal("0"))
        entry = build_purchase_with_balance(purchase, paid)
        if outstanding_only and entry["balance"] <= 0:
            continue
        results.append(entry)
    return results


@router.get("/{purchase_id}", response_model=PurchaseWithBalance)
def get_purchase(purchase_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    purchase = _get_purchase_or_404(db, purchase_id)
    paid = get_amount_paid_for_purchase(db, purchase_id)
    return build_purchase_with_balance(purchase, paid)


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(purchase_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    purchase = _get_purchase_or_404(db, purchase_id)

    has_payments = (
        db.query(PaymentAllocation.id)
        .filter(PaymentAllocation.purchase_id == purchase_id)
        .first()
        is not None
    )
    if has_payments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This purchase is used by the payments module and cannot be deleted.",
        )

    db.delete(purchase)
    db.commit()
