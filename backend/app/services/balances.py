import uuid
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.purchase import Purchase


def get_amounts_paid_by_purchase(
    db: Session, purchase_ids: list[uuid.UUID]
) -> dict[uuid.UUID, Decimal]:
    """Sum of payment_allocations.allocated_amount per purchase, for the given purchases."""
    if not purchase_ids:
        return {}
    rows = (
        db.query(
            PaymentAllocation.purchase_id,
            func.coalesce(func.sum(PaymentAllocation.allocated_amount), 0),
        )
        .filter(PaymentAllocation.purchase_id.in_(purchase_ids))
        .group_by(PaymentAllocation.purchase_id)
        .all()
    )
    return {purchase_id: Decimal(total) for purchase_id, total in rows}


def get_amount_paid_for_purchase(db: Session, purchase_id: uuid.UUID) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(PaymentAllocation.allocated_amount), 0))
        .filter(PaymentAllocation.purchase_id == purchase_id)
        .scalar()
    )
    return Decimal(total)


def purchase_status(total_amount: Decimal, amount_paid: Decimal) -> str:
    if amount_paid <= 0:
        return "unpaid"
    if amount_paid >= total_amount:
        return "paid"
    return "partially_paid"


def build_purchase_with_balance(purchase: Purchase, amount_paid: Decimal) -> dict:
    balance = purchase.total_amount - amount_paid
    return {
        "id": purchase.id,
        "supplier_id": purchase.supplier_id,
        "purchase_date": purchase.purchase_date,
        "invoice_no": purchase.invoice_no,
        "total_amount": purchase.total_amount,
        "line_items": purchase.line_items,
        "created_at": purchase.created_at,
        "updated_at": purchase.updated_at,
        "amount_paid": amount_paid,
        "balance": balance,
        "status": purchase_status(purchase.total_amount, amount_paid),
    }


def get_supplier_outstanding_balance(db: Session, supplier_id: uuid.UUID) -> Decimal:
    """SUM(purchases.total_amount) - SUM(payments.amount) for the supplier."""
    total_purchases = (
        db.query(func.coalesce(func.sum(Purchase.total_amount), 0))
        .filter(Purchase.supplier_id == supplier_id)
        .scalar()
    )
    total_payments = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.supplier_id == supplier_id)
        .scalar()
    )
    return Decimal(total_purchases) - Decimal(total_payments)
