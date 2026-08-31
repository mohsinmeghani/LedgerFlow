#!/bin/bash
# Runs automatically on first container init (empty data directory only) via
# Postgres's /docker-entrypoint-initdb.d/ mechanism. Creates a second database
# for the pytest suite so `docker compose exec api pytest` works out of the box.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ${POSTGRES_DB}_test;
EOSQL
