import os
import uuid
from collections.abc import Generator

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://ledgerflow:change_me@localhost:5433/ledgerflow_test",
)
# app.config.settings is a module-level singleton read at import time, so this
# must be set before any `app.*` module is imported below — it keeps the
# FastAPI lifespan's admin-seeding session pointed at the same test database.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.deps import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models.user import User

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def current_user() -> User:
    return User(
        id=uuid.uuid4(),
        username="testadmin",
        hashed_password="unused",
        role="admin",
        is_active=True,
    )


@pytest.fixture()
def client(db_session: Session, current_user: User) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    def override_get_current_user() -> User:
        return current_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
