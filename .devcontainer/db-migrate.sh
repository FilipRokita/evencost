#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# Nothing to apply before the database stage has produced migrations.
if [ ! -d drizzle ]; then
  exit 0
fi

# The application's .env is created by hand from .env.example. Without it there
# is no connection string, and failing here would abort container creation for a
# step the developer has not reached yet.
if [ ! -f .env ]; then
  echo "db-migrate: no .env yet, skipping. Copy .env.example to .env to apply migrations."
  exit 0
fi

# Idempotent: drizzle-kit skips migrations that are already applied, so running
# this on every start is safe and is what brings the schema back after a rebuild.
npm run db:migrate
