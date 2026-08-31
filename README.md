# LedgerFlow

Internal business application for a leather factory. Phase 1 covers purchasing and
accounts payable: credit purchases from suppliers (with multiple line items), payments
back to suppliers (including partial payments split across multiple invoices), and a
per-supplier ledger/reporting view.

Future phases (not built yet): production tracking, sales, gate pass / material movement
logging, and a native Android client. The backend is a versioned, token-authenticated
REST API specifically so a future mobile client can reuse it without backend changes.

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, Pydantic v2
- **Auth:** JWT bearer tokens (no server-side sessions)
- **Database:** PostgreSQL 16
- **Frontend:** React + TypeScript + Vite
- **Containerization:** Docker + Docker Compose
- **Testing:** pytest

## Project layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, pytest tests
frontend/   React + TypeScript SPA (Vite)
docker-compose.yml         local development stack
docker-compose.prod.yml    production-oriented stack (no bind mounts, no reload)
```

## Local development setup

Requirements: Docker and Docker Compose.

1. Copy the example environment file and adjust as needed:

   ```bash
   cp .env.example .env
   ```

2. Bring up the stack:

   ```bash
   docker compose up --build
   ```

3. Once running:
   - API: http://localhost:8000
   - Swagger / OpenAPI docs: http://localhost:8000/docs
   - Frontend: http://localhost:5173

4. Apply database migrations (first run, or after pulling new migrations):

   ```bash
   docker compose exec api alembic upgrade head
   ```

5. Log in with the seeded admin user (see `.env.example` for
   `ADMIN_USERNAME` / `ADMIN_PASSWORD`, created on first startup).

## Running backend tests

```bash
docker compose exec api pytest
```

or, outside Docker, from `backend/`:

```bash
python -m venv .venv
.venv/Scripts/activate  # or source .venv/bin/activate on Linux/macOS
pip install -r requirements.txt
pytest
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying to a generic Docker-capable VPS
(no cloud-specific services required).

## Status

Phase 1 (purchasing / accounts payable) is under active, incremental development.
See git log for checkpoint-by-checkpoint history.
