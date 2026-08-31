from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.purchase import Purchase
from app.models.supplier import Supplier
from app.services.balances import get_supplier_outstanding_balance


def build_supplier_ledger(
    db: Session,
    supplier: Supplier,
    from_date: date | None,
    to_date: date | None,
) -> dict:
    opening_balance = Decimal("0")
    if from_date is not None:
        purchases_before = (
            db.query(func.coalesce(func.sum(Purchase.total_amount), 0))
            .filter(Purchase.supplier_id == supplier.id, Purchase.purchase_date < from_date)
            .scalar()
        )
        payments_before = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .filter(Payment.supplier_id == supplier.id, Payment.payment_date < from_date)
            .scalar()
        )
        opening_balance = Decimal(purchases_before) - Decimal(payments_before)

    purchase_query = db.query(Purchase).filter(Purchase.supplier_id == supplier.id)
    if from_date is not None:
        purchase_query = purchase_query.filter(Purchase.purchase_date >= from_date)
    if to_date is not None:
        purchase_query = purchase_query.filter(Purchase.purchase_date <= to_date)
    purchases = purchase_query.all()

    payment_query = db.query(Payment).filter(Payment.supplier_id == supplier.id)
    if from_date is not None:
        payment_query = payment_query.filter(Payment.payment_date >= from_date)
    if to_date is not None:
        payment_query = payment_query.filter(Payment.payment_date <= to_date)
    payments = payment_query.all()

    events = [
        {
            "type": "purchase",
            "id": purchase.id,
            "date": purchase.purchase_date,
            "reference": purchase.invoice_no,
            "debit": purchase.total_amount,
            "credit": Decimal("0"),
            "sort_key": (purchase.purchase_date, purchase.created_at),
        }
        for purchase in purchases
    ] + [
        {
            "type": "payment",
            "id": payment.id,
            "date": payment.payment_date,
            "reference": payment.method,
            "debit": Decimal("0"),
            "credit": payment.amount,
            "sort_key": (payment.payment_date, payment.created_at),
        }
        for payment in payments
    ]
    events.sort(key=lambda e: e["sort_key"])

    running_balance = opening_balance
    entries = []
    for event in events:
        running_balance = running_balance + event["debit"] - event["credit"]
        entries.append(
            {
                "type": event["type"],
                "id": event["id"],
                "date": event["date"],
                "reference": event["reference"],
                "debit": event["debit"],
                "credit": event["credit"],
                "running_balance": running_balance,
            }
        )

    return {
        "supplier_id": supplier.id,
        "supplier_name": supplier.name,
        "from_date": from_date,
        "to_date": to_date,
        "opening_balance": opening_balance,
        "closing_balance": running_balance,
        "current_outstanding_balance": get_supplier_outstanding_balance(db, supplier.id),
        "entries": entries,
    }
