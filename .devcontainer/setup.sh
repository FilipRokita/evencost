#!/usr/bin/env bash
set -e

# Local PostgreSQL 17 + dev role/database
bash ".devcontainer/db-setup.sh"

# Install project dependencies
yarn install