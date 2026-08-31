from fastapi.testclient import TestClient


def _make_supplier(client: TestClient, name: str) -> str:
    return client.post("/api/v1/suppliers", json={"name": name}).json()["id"]


def _make_item(client: TestClient) -> str:
    return client.post("/api/v1/items", json={"name": "Leather", "unit": "sqft"}).json()["id"]


def _make_purchase(client: TestClient, supplier_id: str, item_id: str, amount: str) -> dict:
    return client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": amount}],
        },
    ).json()


def test_dashboard_totals_and_ranking(client: TestClient) -> None:
    item_id = _make_item(client)
    supplier_a = _make_supplier(client, "Supplier A")
    supplier_b = _make_supplier(client, "Supplier B")

    _make_purchase(client, supplier_a, item_id, "1000.00")
    _make_purchase(client, supplier_b, item_id, "300.00")
    client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_a,
            "payment_date": "2026-01-20",
            "amount": "200.00",
            "method": "cash",
        },
    )

    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    body = response.json()

    assert body["total_outstanding"] == "1100.00"

    ranking = body["suppliers_by_outstanding"]
    assert ranking[0]["supplier_name"] == "Supplier A"
    assert ranking[0]["outstanding_balance"] == "800.00"
    assert ranking[1]["supplier_name"] == "Supplier B"
    assert ranking[1]["outstanding_balance"] == "300.00"

    assert len(body["recent_activity"]) == 3
    types = {entry["type"] for entry in body["recent_activity"]}
    assert types == {"purchase", "payment"}
