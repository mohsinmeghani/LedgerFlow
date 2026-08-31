from fastapi.testclient import TestClient


def _make_supplier(client: TestClient, name: str = "Acme Tannery") -> str:
    return client.post("/api/v1/suppliers", json={"name": name}).json()["id"]


def _make_item(client: TestClient, name: str = "Leather", unit: str = "sqft") -> str:
    return client.post("/api/v1/items", json={"name": name, "unit": unit}).json()["id"]


def _make_purchase(client: TestClient, supplier_id: str, item_id: str, amount: str) -> dict:
    return client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": amount}],
        },
    ).json()


def test_create_payment_with_full_allocation(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase = _make_purchase(client, supplier_id, item_id, "1000.00")

    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "1000.00",
            "method": "bank transfer",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "1000.00"}],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == "1000.00"
    assert len(body["allocations"]) == 1

    purchase_after = client.get(f"/api/v1/purchases/{purchase['id']}").json()
    assert purchase_after["status"] == "paid"
    assert purchase_after["balance"] == "0.00"


def test_partial_payment_split_across_two_purchases(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase1 = _make_purchase(client, supplier_id, item_id, "600.00")
    purchase2 = _make_purchase(client, supplier_id, item_id, "400.00")

    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "500.00",
            "method": "cash",
            "allocations": [
                {"purchase_id": purchase1["id"], "allocated_amount": "300.00"},
                {"purchase_id": purchase2["id"], "allocated_amount": "200.00"},
            ],
        },
    )
    assert response.status_code == 201

    p1 = client.get(f"/api/v1/purchases/{purchase1['id']}").json()
    p2 = client.get(f"/api/v1/purchases/{purchase2['id']}").json()
    assert p1["status"] == "partially_paid"
    assert p1["balance"] == "300.00"
    assert p2["status"] == "partially_paid"
    assert p2["balance"] == "200.00"


def test_allocation_sum_cannot_exceed_payment_amount(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase = _make_purchase(client, supplier_id, item_id, "1000.00")

    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "100.00",
            "method": "cash",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "200.00"}],
        },
    )
    assert response.status_code == 422


def test_allocation_sum_cannot_exceed_purchase_outstanding_balance(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase = _make_purchase(client, supplier_id, item_id, "500.00")

    # First payment covers half.
    client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "300.00",
            "method": "cash",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "300.00"}],
        },
    )

    # Second payment tries to allocate more than the remaining 200.00 balance.
    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-21",
            "amount": "300.00",
            "method": "cash",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "250.00"}],
        },
    )
    assert response.status_code == 422


def test_allocation_rejects_purchase_from_different_supplier(client: TestClient) -> None:
    supplier1 = _make_supplier(client, "Supplier One")
    supplier2 = _make_supplier(client, "Supplier Two")
    item_id = _make_item(client)
    purchase = _make_purchase(client, supplier1, item_id, "500.00")

    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier2,
            "payment_date": "2026-01-20",
            "amount": "500.00",
            "method": "cash",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "500.00"}],
        },
    )
    assert response.status_code == 422


def test_payment_without_allocations_is_allowed(client: TestClient) -> None:
    supplier_id = _make_supplier(client)

    response = client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "250.00",
            "method": "cash",
        },
    )
    assert response.status_code == 201
    assert response.json()["allocations"] == []
