from fastapi.testclient import TestClient


def test_create_and_list_item_category(client: TestClient) -> None:
    response = client.post("/api/v1/item-categories", json={"name": "raw material"})
    assert response.status_code == 201
    assert response.json()["name"] == "raw material"

    response = client.get("/api/v1/item-categories")
    assert response.status_code == 200
    names = [c["name"] for c in response.json()]
    assert "raw material" in names


def test_duplicate_category_name_rejected(client: TestClient) -> None:
    client.post("/api/v1/item-categories", json={"name": "chemical"})
    response = client.post("/api/v1/item-categories", json={"name": "chemical"})
    assert response.status_code == 409


def test_delete_unused_category_succeeds(client: TestClient) -> None:
    category = client.post("/api/v1/item-categories", json={"name": "unused"}).json()

    response = client.delete(f"/api/v1/item-categories/{category['id']}")
    assert response.status_code == 204

    remaining = [c["name"] for c in client.get("/api/v1/item-categories").json()]
    assert "unused" not in remaining


def test_delete_category_used_by_item_is_blocked(client: TestClient) -> None:
    category = client.post("/api/v1/item-categories", json={"name": "leather"}).json()
    client.post(
        "/api/v1/items", json={"name": "Cow Hide", "unit": "sqft", "category_id": category["id"]}
    )

    response = client.delete(f"/api/v1/item-categories/{category['id']}")
    assert response.status_code == 409
    assert "items" in response.json()["detail"]
