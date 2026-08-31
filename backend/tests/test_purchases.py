from fastapi.testclient import TestClient


def _make_supplier(client: TestClient, name: str = "Acme Tannery") -> str:
    return client.post("/api/v1/suppliers", json={"name": name}).json()["id"]


def _make_item(client: TestClient, name: str = "Full Grain Leather", unit: str = "sqft") -> str:
    return client.post("/api/v1/items", json={"name": name, "unit": unit}).json()["id"]


def test_create_purchase_computes_totals_server_side(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_a = _make_item(client, "Leather")
    item_b = _make_item(client, "Dye", unit="kg")

    response = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "invoice_no": "INV-001",
            "line_items": [
                {"item_id": item_a, "quantity": "10", "rate": "150.50"},
                {"item_id": item_b, "quantity": "2.5", "rate": "40.00"},
            ],
        },
    )
    assert response.status_code == 201
    body = response.json()
    # 10 * 150.50 = 1505.00, 2.5 * 40.00 = 100.00 -> total 1605.00
    assert body["total_amount"] == "1605.00"
    assert len(body["line_items"]) == 2
    assert body["line_items"][0]["amount"] == "1505.00"
    assert body["line_items"][1]["amount"] == "100.00"


def test_create_purchase_ignores_client_supplied_total(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)

    response = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "total_amount": "999999.99",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": "10.00"}],
        },
    )
    assert response.status_code == 201
    assert response.json()["total_amount"] == "10.00"


def test_create_purchase_requires_at_least_one_line_item(client: TestClient) -> None:
    supplier_id = _make_supplier(client)

    response = client.post(
        "/api/v1/purchases",
        json={"supplier_id": supplier_id, "purchase_date": "2026-01-15", "line_items": []},
    )
    assert response.status_code == 422


def test_create_purchase_rejects_unknown_supplier(client: TestClient) -> None:
    item_id = _make_item(client)
    response = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": "00000000-0000-0000-0000-000000000000",
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": "10.00"}],
        },
    )
    assert response.status_code == 404


def test_create_purchase_rejects_unknown_item(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    response = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [
                {"item_id": "00000000-0000-0000-0000-000000000000", "quantity": "1", "rate": "10.00"}
            ],
        },
    )
    assert response.status_code == 422


def test_duplicate_invoice_no_for_same_supplier_rejected(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    payload = {
        "supplier_id": supplier_id,
        "purchase_date": "2026-01-15",
        "invoice_no": "DUP-1",
        "line_items": [{"item_id": item_id, "quantity": "1", "rate": "10.00"}],
    }
    first = client.post("/api/v1/purchases", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/purchases", json=payload)
    assert second.status_code == 409


def test_list_purchases_includes_balance_and_status(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": "500.00"}],
        },
    )

    response = client.get("/api/v1/purchases", params={"supplier_id": supplier_id})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["amount_paid"] == "0.00" or body[0]["amount_paid"] == "0"
    assert body[0]["status"] == "unpaid"
    assert body[0]["balance"] == body[0]["total_amount"]


def test_delete_unpaid_purchase_succeeds(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": "100.00"}],
        },
    ).json()

    response = client.delete(f"/api/v1/purchases/{purchase['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/v1/purchases/{purchase['id']}")
    assert response.status_code == 404


def test_delete_purchase_with_payment_allocation_is_blocked(client: TestClient) -> None:
    supplier_id = _make_supplier(client)
    item_id = _make_item(client)
    purchase = client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier_id,
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item_id, "quantity": "1", "rate": "100.00"}],
        },
    ).json()
    client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier_id,
            "payment_date": "2026-01-20",
            "amount": "50.00",
            "method": "cash",
            "allocations": [{"purchase_id": purchase["id"], "allocated_amount": "50.00"}],
        },
    )

    response = client.delete(f"/api/v1/purchases/{purchase['id']}")
    assert response.status_code == 409
    assert "payments" in response.json()["detail"]
