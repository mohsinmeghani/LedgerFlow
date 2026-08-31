import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.purchase import Purchase
from app.models.supplier import Supplier
from app.schemas.payment import PaymentCreate, PaymentRead
from app.services.balances import get_amounts_paid_by_purchase

router = APIRouter(
    prefix="/api/v1/payments",
    tags=["payments"],
    dependencies=[Depends(get_current_user)],
)


def _get_payment_or_404(db: Session, payment_id: uuid.UUID) -> Payment:
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.allocations))
        .filter(Payment.id == payment_id)
        .first()
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)) -> Payment:
    supplier = db.get(Supplier, payload.supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    purchase_ids = [allocation.purchase_id for allocation in payload.allocations]
    if len(purchase_ids) != len(set(purchase_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate purchase_id in allocations; combine into a single allocation",
        )

    total_allocated = sum((a.allocated_amount for a in payload.allocations), Decimal("0"))
    if total_allocated > payload.amount:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sum of allocated amounts exceeds the payment amount",
        )

    purchases_by_id: dict[uuid.UUID, Purchase] = {}
    if purchase_ids:
        rows = db.query(Purchase).filter(Purchase.id.in_(purchase_ids)).all()
        purchases_by_id = {p.id: p for p in rows}
        missing = set(purchase_ids) - set(purchases_by_id)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown purchase id(s): {', '.join(str(i) for i in missing)}",
            )
        for purchase in purchases_by_id.values():
            if purchase.supplier_id != payload.supplier_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Purchase {purchase.id} does not belong to supplier {payload.supplier_id}",
                )

    already_paid = get_amounts_paid_by_purchase(db, purchase_ids)
    for allocation in payload.allocations:
        purchase = purchases_by_id[allocation.purchase_id]
        existing = already_paid.get(allocation.purchase_id, Decimal("0"))
        if existing + allocation.allocated_amount > purchase.total_amount:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Allocation to purchase {purchase.id} exceeds its outstanding balance "
                    f"(outstanding: {purchase.total_amount - existing})"
                ),
            )

    payment = Payment(
        supplier_id=payload.supplier_id,
        payment_date=payload.payment_date,
        amount=payload.amount,
        method=payload.method,
        notes=payload.notes,
    )
    for allocation in payload.allocations:
        payment.allocations.append(
            PaymentAllocation(
                purchase_id=allocation.purchase_id,
                allocated_amount=allocation.allocated_amount,
            )
        )

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=list[PaymentRead])
def list_payments(
    supplier_id: uuid.UUID | None = None, db: Session = Depends(get_db)
) -> list[Payment]:
    query = db.query(Payment).options(joinedload(Payment.allocations))
    if supplier_id is not None:
        query = query.filter(Payment.supplier_id == supplier_id)
    return query.order_by(Payment.payment_date.desc(), Payment.created_at.desc()).all()


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: uuid.UUID, db: Session = Depends(get_db)) -> Payment:
    return _get_payment_or_404(db, payment_id)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    payment = _get_payment_or_404(db, payment_id)
    # Nothing else references a payment as a foreign key besides its own
    # allocations, which cascade-delete with it — deleting a payment simply
    # frees up whatever balance it had allocated against those purchases.
    db.delete(payment)
    db.commit()
