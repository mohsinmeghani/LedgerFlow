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

3. The `api` container applies Alembic migrations automatically on startup, so
   there's nothing else to run manually. Once everything is up:
   - API: http://localhost:8000
   - Swagger / OpenAPI docs: http://localhost:8000/docs
   - Frontend: http://localhost:5173
   - Postgres (for a local DB client): `localhost:5433` (mapped from the
     container's 5432 — 5433 is used on the host to avoid clashing with any
     Postgres you might already have running locally; services still talk to
     each other over the Docker network on port 5432)

4. Log in with the seeded admin user (see `.env.example` for
   `ADMIN_USERNAME` / `ADMIN_PASSWORD`, created on first startup — seeding
   only happens once, when the `users` table is empty).

## API overview

All endpoints live under `/api/v1` and require a JWT bearer token (from
`POST /api/v1/auth/login`), except login itself. Key resources:

- `suppliers`, `items`, `item-categories`, `purchases`, `payments` — full CRUD.
  `DELETE` on any of them permanently removes the row, but is rejected with
  `409` if another module still references it (e.g. a supplier with purchases
  or payments, an item used in a purchase, a category assigned to an item, or
  a purchase with payments allocated against it). A payment has nothing
  referencing it besides its own allocations, so it can always be deleted —
  doing so frees up whatever balance it had allocated. Suppliers also support
  a separate deactivate/reactivate toggle (`PUT .../{id}` with
  `is_active: false|true`) for retiring a supplier with transaction history
  instead of deleting it.
- `purchases` — create with line items (totals are always server-computed);
  list/get responses include a derived `amount_paid` / `balance` / `status`
- `payments` — create with optional `allocations` against the supplier's
  purchases; over-allocation (past the payment amount or a purchase's
  remaining balance) is rejected with `422`
- `suppliers/{id}/ledger` — statement view with optional `from_date`/`to_date`,
  returning opening/closing/running balances plus the supplier's true current
  outstanding balance
- `dashboard` — total payables outstanding, suppliers ranked by balance,
  recent activity

## Running backend tests

```bash
docker compose exec api pytest
```

The `db` container automatically creates a second `..._test` database (via
`backend/scripts/init-test-db.sh`, run by Postgres on first init) so this
works with no extra setup.

To run outside Docker, from `backend/`:

```bash
python -m venv .venv
.venv/Scripts/activate  # or source .venv/bin/activate on Linux/macOS
pip install -r requirements.txt
pytest
```

This path needs a reachable Postgres and a `TEST_DATABASE_URL` env var (or
the default in `backend/tests/conftest.py`, which points at
`localhost:5433/ledgerflow_test` — create that database yourself first if
you're not going through `docker compose exec api pytest`).

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying to a generic Docker-capable VPS
(no cloud-specific services required).

## Status

Phase 1 (purchasing / accounts payable) is feature-complete: supplier/item
CRUD, purchase entry, payment + allocation entry, the supplier ledger report,
and the dashboard are all implemented on both the API and the React frontend,
with pytest coverage for the balance/allocation/ledger logic. See git log for
checkpoint-by-checkpoint history.

Explicitly out of scope for this phase: production tracking, sales, gate
pass / material movement logging, and a native Android client (the JWT-based
REST API is structured so a future mobile client can reuse it unchanged).
