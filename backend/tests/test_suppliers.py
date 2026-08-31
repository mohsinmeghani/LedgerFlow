from fastapi.testclient import TestClient


def test_create_and_list_supplier(client: TestClient) -> None:
    response = client.post(
        "/api/v1/suppliers",
        json={"name": "Acme Tannery", "contact": "9876543210", "address": "Plot 4, Kanpur"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Acme Tannery"
    assert body["is_active"] is True

    response = client.get("/api/v1/suppliers")
    assert response.status_code == 200
    names = [s["name"] for s in response.json()]
    assert "Acme Tannery" in names


def test_update_supplier(client: TestClient) -> None:
    created = client.post("/api/v1/suppliers", json={"name": "Old Name"}).json()

    response = client.put(f"/api/v1/suppliers/{created['id']}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_deactivate_supplier_excluded_from_default_list(client: TestClient) -> None:
    created = client.post("/api/v1/suppliers", json={"name": "To Deactivate"}).json()

    response = client.put(f"/api/v1/suppliers/{created['id']}", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    active = client.get("/api/v1/suppliers").json()
    assert all(s["id"] != created["id"] for s in active)

    everyone = client.get("/api/v1/suppliers", params={"include_inactive": True}).json()
    deactivated = next(s for s in everyone if s["id"] == created["id"])
    assert deactivated["is_active"] is False


def test_delete_unused_supplier_succeeds(client: TestClient) -> None:
    created = client.post("/api/v1/suppliers", json={"name": "Never Used"}).json()

    response = client.delete(f"/api/v1/suppliers/{created['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/v1/suppliers/{created['id']}")
    assert response.status_code == 404


def test_delete_supplier_with_purchases_is_blocked(client: TestClient) -> None:
    supplier = client.post("/api/v1/suppliers", json={"name": "Has Purchases"}).json()
    item = client.post("/api/v1/items", json={"name": "Leather", "unit": "sqft"}).json()
    client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier["id"],
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item["id"], "quantity": "1", "rate": "10.00"}],
        },
    )

    response = client.delete(f"/api/v1/suppliers/{supplier['id']}")
    assert response.status_code == 409
    assert "purchases" in response.json()["detail"]

    still_there = client.get(f"/api/v1/suppliers/{supplier['id']}")
    assert still_there.status_code == 200


def test_delete_supplier_with_payments_is_blocked(client: TestClient) -> None:
    supplier = client.post("/api/v1/suppliers", json={"name": "Has Payments"}).json()
    client.post(
        "/api/v1/payments",
        json={
            "supplier_id": supplier["id"],
            "payment_date": "2026-01-15",
            "amount": "100.00",
            "method": "cash",
        },
    )

    response = client.delete(f"/api/v1/suppliers/{supplier['id']}")
    assert response.status_code == 409
    assert "payments" in response.json()["detail"]


def test_get_missing_supplier_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/suppliers/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
