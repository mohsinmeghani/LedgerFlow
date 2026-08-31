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
