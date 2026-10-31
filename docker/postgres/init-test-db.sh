#!/bin/bash
# Tworzy bazę testową. Nazwa z POSTGRES_DB_TEST (Compose / .env).
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_DB_TEST:?POSTGRES_DB_TEST is required}"

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  -c "CREATE DATABASE \"${POSTGRES_DB_TEST}\";"
