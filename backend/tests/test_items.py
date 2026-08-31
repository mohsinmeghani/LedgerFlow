from fastapi.testclient import TestClient


def _make_category(client: TestClient, name: str = "raw") -> str:
    return client.post("/api/v1/item-categories", json={"name": name}).json()["id"]


def test_create_and_list_item(client: TestClient) -> None:
    category_id = _make_category(client)

    response = client.post(
        "/api/v1/items",
        json={"name": "Full Grain Leather", "unit": "sqft", "category_id": category_id},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["unit"] == "sqft"
    assert body["category_id"] == category_id

    response = client.get("/api/v1/items")
    assert response.status_code == 200
    names = [i["name"] for i in response.json()]
    assert "Full Grain Leather" in names


def test_create_item_without_category(client: TestClient) -> None:
    response = client.post("/api/v1/items", json={"name": "Misc", "unit": "pcs"})
    assert response.status_code == 201
    assert response.json()["category_id"] is None


def test_create_item_rejects_unknown_category(client: TestClient) -> None:
    response = client.post(
        "/api/v1/items",
        json={
            "name": "Dye",
            "unit": "kg",
            "category_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert response.status_code == 422


def test_update_item(client: TestClient) -> None:
    category_id = _make_category(client, "chemical")
    created = client.post(
        "/api/v1/items", json={"name": "Dye", "unit": "kg", "category_id": category_id}
    ).json()

    response = client.put(f"/api/v1/items/{created['id']}", json={"unit": "ltr"})
    assert response.status_code == 200
    assert response.json()["unit"] == "ltr"
    assert response.json()["name"] == "Dye"
    assert response.json()["category_id"] == category_id


def test_delete_unused_item_succeeds(client: TestClient) -> None:
    created = client.post("/api/v1/items", json={"name": "Unused", "unit": "pcs"}).json()

    response = client.delete(f"/api/v1/items/{created['id']}")
    assert response.status_code == 204

    response = client.get(f"/api/v1/items/{created['id']}")
    assert response.status_code == 404


def test_delete_item_used_in_purchase_is_blocked(client: TestClient) -> None:
    item = client.post("/api/v1/items", json={"name": "Leather", "unit": "sqft"}).json()
    supplier = client.post("/api/v1/suppliers", json={"name": "Acme"}).json()
    client.post(
        "/api/v1/purchases",
        json={
            "supplier_id": supplier["id"],
            "purchase_date": "2026-01-15",
            "line_items": [{"item_id": item["id"], "quantity": "1", "rate": "10.00"}],
        },
    )

    response = client.delete(f"/api/v1/items/{item['id']}")
    assert response.status_code == 409
    assert "purchases" in response.json()["detail"]
