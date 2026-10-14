#!/usr/bin/env bash
set -e

# Install Claude Code via the official installer
curl -fsSL https://claude.ai/install.sh | bash

# Install project dependencies
yarn install