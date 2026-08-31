from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.payment import Payment
from app.models.purchase import Purchase
from app.models.supplier import Supplier

RECENT_ACTIVITY_LIMIT = 10


def build_dashboard(db: Session) -> dict:
    purchases_by_supplier = dict(
        db.query(Purchase.supplier_id, func.coalesce(func.sum(Purchase.total_amount), 0))
        .group_by(Purchase.supplier_id)
        .all()
    )
    payments_by_supplier = dict(
        db.query(Payment.supplier_id, func.coalesce(func.sum(Payment.amount), 0))
        .group_by(Payment.supplier_id)
        .all()
    )

    suppliers = db.query(Supplier).all()
    summaries = []
    total_outstanding = Decimal("0")
    for supplier in suppliers:
        purchased = Decimal(purchases_by_supplier.get(supplier.id, 0))
        paid = Decimal(payments_by_supplier.get(supplier.id, 0))
        balance = purchased - paid
        total_outstanding += balance
        summaries.append(
            {
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "outstanding_balance": balance,
            }
        )
    summaries.sort(key=lambda s: s["outstanding_balance"], reverse=True)

    recent_purchases = (
        db.query(Purchase)
        .options(joinedload(Purchase.supplier))
        .order_by(Purchase.created_at.desc())
        .limit(RECENT_ACTIVITY_LIMIT)
        .all()
    )
    recent_payments = (
        db.query(Payment)
        .options(joinedload(Payment.supplier))
        .order_by(Payment.created_at.desc())
        .limit(RECENT_ACTIVITY_LIMIT)
        .all()
    )

    activity = [
        {
            "type": "purchase",
            "id": purchase.id,
            "date": purchase.purchase_date,
            "supplier_id": purchase.supplier_id,
            "supplier_name": purchase.supplier.name,
            "amount": purchase.total_amount,
            "reference": purchase.invoice_no,
            "_sort": purchase.created_at,
        }
        for purchase in recent_purchases
    ] + [
        {
            "type": "payment",
            "id": payment.id,
            "date": payment.payment_date,
            "supplier_id": payment.supplier_id,
            "supplier_name": payment.supplier.name,
            "amount": payment.amount,
            "reference": payment.method,
            "_sort": payment.created_at,
        }
        for payment in recent_payments
    ]
    activity.sort(key=lambda item: item["_sort"], reverse=True)
    activity = activity[:RECENT_ACTIVITY_LIMIT]

    return {
        "total_outstanding": total_outstanding,
        "suppliers_by_outstanding": summaries,
        "recent_activity": activity,
    }
