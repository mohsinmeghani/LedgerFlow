from fastapi.testclient import TestClient


def _make_supplier(client: TestClient, name: str = "Acme Tannery") -> str:
    return client.post("/api/v1/suppliers", json={"name": name}).json()["id"]


def _make_item(client: TestClient, name: str = "Leather", unit: str = "sqft") -> str:
    return client.post("/api/v1/items", json={"name": name, "unit": unit}).json()["id"]


def _make_purchase(
    client: TestClient, supplier_id: str, item_id: str, purchase_date: str, amount: str
) -> dict:
    return client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": purchase_date,
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": amount}],
        },
    ).json()


def _make_payment(client: TestClient, supplier_id: str, payment_date: str, amount: str) -> dict:
    return client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": payment_date,
            "amount": amount,
            "method": "cash",
        },
    ).json()


def test_ledger_full_history_running_balance(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)

    _make_purchase(client, supplier_id, item_id, "2026-01-01", "1000.00")
    _make_payment(client, supplier_id, "2026-01-05", "400.00")
    _make_purchase(client, supplier_id, item_id, "2026-01-10", "500.00")

    response = client.get(f"/api/v1/suppliers/{supplier_id}/ledger")
    assert response.status_code == 200
    body = response.json()

    assert body["opening_balance"] == "0"
    assert len(body["entries"]) == 3
    assert body["entries"][0]["type"] == "purchase"
    assert body["entries"][0]["running_balance"] == "1000.00"
    assert body["entries"][1]["type"] == "payment"
    assert body["entries"][1]["running_balance"] == "600.00"
    assert body["entries"][2]["type"] == "purchase"
    assert body["entries"][2]["running_balance"] == "1100.00"
    assert body["closing_balance"] == "1100.00"
    assert body["current_outstanding_balance"] == "1100.00"


def test_ledger_date_range_opening_and_closing_balance(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)

    _make_purchase(client, supplier_id, item_id, "2026-01-01", "1000.00")
    _make_payment(client, supplier_id, "2026-01-05", "400.00")
    _make_purchase(client, supplier_id, item_id, "2026-02-10", "500.00")
    _make_payment(client, supplier_id, "2026-02-15", "200.00")

    # Range covering only the February activity.
    response = client.get(
        f"/api/v1/suppliers/{supplier_id}/ledger",
        params={"from_date": "2026-02-01", "to_date": "2026-02-28"},
    )
    assert response.status_code == 200
    body = response.json()

    # Opening balance = purchases before 2026-02-01 minus payments before 2026-02-01
    # = 1000.00 - 400.00 = 600.00
    assert body["opening_balance"] == "600.00"
    assert len(body["entries"]) == 2
    # 600 + 500 (purchase) = 1100, then 1100 - 200 (payment) = 900
    assert body["entries"][0]["running_balance"] == "1100.00"
    assert body["entries"][1]["running_balance"] == "900.00"
    assert body["closing_balance"] == "900.00"
    # Current outstanding balance is independent of the filtered range.
    assert body["current_outstanding_balance"] == "900.00"


def test_ledger_rejects_from_date_after_to_date(client: TestClient) -> None:
    supplier_id = _make_supplier(client)

    response = client.get(
        f"/api/v1/suppliers/{supplier_id}/ledger",
        params={"from_date": "2026-02-01", "to_date": "2026-01-01"},
    )
    assert response.status_code == 422


def test_ledger_for_missing_supplier_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/suppliers/00000000-0000-0000-0000-000000000000/ledger")
    assert response.status_code == 404
