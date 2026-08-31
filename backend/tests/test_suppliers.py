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


def test_soft_delete_supplier_excluded_from_default_list(client: TestClient) -> None:
    created = client.post("/api/v1/suppliers", json={"name": "To Delete"}).json()

    response = client.delete(f"/api/v1/suppliers/{created['id']}")
    assert response.status_code == 204

    active = client.get("/api/v1/suppliers").json()
    assert all(s["id"] != created["id"] for s in active)

    everyone = client.get("/api/v1/suppliers", params={"include_inactive": True}).json()
    deleted = next(s for s in everyone if s["id"] == created["id"])
    assert deleted["is_active"] is False


def test_get_missing_supplier_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/suppliers/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
