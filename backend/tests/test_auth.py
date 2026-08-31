from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.main import app
from app.models.user import User


def test_login_succeeds_with_correct_credentials(db_session: Session) -> None:
    user = User(
        username="alice",
        hashed_password=hash_password("s3cret"),
        role="admin",
    )
    db_session.add(user)
    db_session.commit()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/login", data={"username": "alice", "password": "s3cret"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_rejects_wrong_password(db_session: Session) -> None:
    user = User(
        username="alice",
        hashed_password=hash_password("s3cret"),
        role="admin",
    )
    db_session.add(user)
    db_session.commit()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/auth/login", data={"username": "alice", "password": "wrong"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401


def test_protected_route_rejects_missing_token(db_session: Session) -> None:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/suppliers")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
