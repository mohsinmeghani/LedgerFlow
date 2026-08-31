# Deployment

Deploying LedgerFlow to a fresh Ubuntu VPS (works the same on Lightsail, EC2,
DigitalOcean, Oracle Cloud, or any bare Ubuntu box with a public IP — nothing
here is cloud-specific). Steps assume Ubuntu 22.04/24.04 and a non-root sudo
user.

## 1. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Run docker without sudo (log out and back in after this)
sudo usermod -aG docker $USER
```

Verify:

```bash
docker --version
docker compose version
```

## 2. Clone the repository

```bash
sudo apt-get install -y git
git clone <your-repo-url> ledgerflow
cd ledgerflow
```

## 3. Configure environment

```bash
cp .env.example .env
nano .env
```

At minimum, change for production:

- `POSTGRES_PASSWORD` — a strong, unique password
- `JWT_SECRET_KEY` — a long random string (e.g. `openssl rand -hex 32`)
- `ADMIN_PASSWORD` — the password for the seeded admin user
- `CORS_ORIGINS` — the public origin(s) the frontend will be served from
  (e.g. `https://ledger.yourdomain.com`); comma-separate multiple origins
- `VITE_API_BASE_URL` — the **publicly reachable** API URL the browser will
  call, e.g. `https://ledger.yourdomain.com/api/v1` or
  `http://YOUR_SERVER_IP:8000/api/v1` if you're not putting a domain/proxy in
  front yet. This is baked into the frontend's static build at image build
  time (it's a Vite env var), so changing it later means rebuilding the
  `frontend` image.

## 4. Bring up the stack

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This builds and starts three containers:

- `db` — Postgres 16, data persisted in the `db_data` named volume
- `api` — FastAPI, running Alembic migrations automatically on startup, then
  Uvicorn without `--reload`
- `frontend` — a static production build of the React app served by Nginx,
  listening on port 80

Check everything came up healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

The app is now reachable at `http://YOUR_SERVER_IP` (frontend) and
`http://YOUR_SERVER_IP:8000/docs` (API docs).

## 5. Firewall

If using `ufw`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp   # only if the frontend calls the API directly by IP/port
sudo ufw enable
```

If you put a reverse proxy in front (recommended — see below), you generally
only need `80`/`443` open and can drop the direct `8000` rule.

## 6. Put a domain and TLS in front (recommended)

`docker-compose.prod.yml` deliberately doesn't include a reverse proxy or TLS
termination — that's environment-specific and out of scope for this compose
file. A minimal approach with Nginx + Certbot on the host:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Point an Nginx server block at `127.0.0.1:80` (the `frontend` container) for
the site, and at `127.0.0.1:8000` for `/api/`, then run:

```bash
sudo certbot --nginx -d ledger.yourdomain.com
```

If you take this route, set `VITE_API_BASE_URL=https://ledger.yourdomain.com/api/v1`
and `CORS_ORIGINS=https://ledger.yourdomain.com` in `.env` before building, so
the frontend calls the API through the same TLS-terminated domain.

## Updating a deployment

```bash
cd ledgerflow
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

Migrations run automatically as part of the `api` container's startup, so a
plain rebuild-and-restart picks up schema changes too.

## Backups

The database lives in the `db_data` Docker volume. A simple periodic backup:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%Y%m%d).sql
```

Restore with:

```bash
cat backup-YYYYMMDD.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Troubleshooting

- **`api` container exits immediately** — check `docker compose -f docker-compose.prod.yml logs api`;
  usually a bad `DATABASE_URL`/`POSTGRES_*` mismatch in `.env`, or the `db`
  container not yet healthy (the `api` service waits on `db`'s healthcheck,
  but a first-boot Postgres init can take a few extra seconds).
- **Frontend loads but API calls fail / CORS errors in the browser console** —
  `VITE_API_BASE_URL` was baked in wrong at build time, or `CORS_ORIGINS`
  doesn't match the origin the frontend is actually served from. Fix `.env`
  and re-run `docker compose -f docker-compose.prod.yml up --build -d`.
- **Login fails with correct credentials** — the admin user is only seeded
  once, when the `users` table is empty. If you changed `ADMIN_PASSWORD`
  after the first boot, it won't retroactively apply; update the row
  directly or reset the `db_data` volume on a non-production environment.
