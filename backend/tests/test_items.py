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
