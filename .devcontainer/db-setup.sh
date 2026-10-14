#!/usr/bin/env bash
set -e

# Local PostgreSQL 17 (Debian's native version, no third-party repo needed).
# Data lives in the container layer, so it is wiped on every rebuild.
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-17

# The package creates the cluster but nothing starts it inside a container
bash ".devcontainer/db-start.sh"

# Role + database the app connects with. Must match DATABASE_URL in .env.
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='evencost'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE evencost LOGIN PASSWORD 'evencost';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='evencost'" | grep -q 1 \
  || sudo -u postgres createdb -O evencost evencost
