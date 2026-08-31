from fastapi.testclient import TestClient


def test_create_and_list_item(client: TestClient) -> None:
    response = client.post(
        "/api/v1/items", json={"name": "Full Grain Leather", "unit": "sqft", "category": "raw"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["unit"] == "sqft"

    response = client.get("/api/v1/items")
    assert response.status_code == 200
    names = [i["name"] for i in response.json()]
    assert "Full Grain Leather" in names


def test_update_item(client: TestClient) -> None:
    created = client.post(
        "/api/v1/items", json={"name": "Dye", "unit": "kg", "category": "chemical"}
    ).json()

    response = client.put(f"/api/v1/items/{created['id']}", json={"unit": "ltr"})
    assert response.status_code == 200
    assert response.json()["unit"] == "ltr"
    assert response.json()["name"] == "Dye"
