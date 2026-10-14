# 💸 EvenCost

A web app for splitting shared expenses in groups — trips, flatmates, projects.

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL_17-4169E1?logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-1C1C1C?logo=drizzle&logoColor=C5F74F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

> 🚧 **Early development.** The dev environment is set up; application code has
> not been started yet.

## ✨ What it does

1. Create a group and invite people
2. Add an expense and choose how to split it — equally, by exact amounts, or by percentage
3. The app computes who owes whom
4. It shows the **minimal set of transfers** needed to settle up, instead of everyone paying everyone back
5. Mark a debt as settled and it disappears

## 🧱 Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js (App Router), Tailwind, shadcn/ui |
| Backend | Server Actions + Route Handlers |
| Database | PostgreSQL 17 — installed locally in the dev container |
| ORM | Drizzle |
| Auth | Auth.js |
| Dev environment | Dev Container (VS Code) |

The app connects to the database through a single `DATABASE_URL`, so the local
Postgres can be swapped for a hosted one (Neon, Supabase) without code changes.

## 🚀 Development setup

Everything runs inside the dev container. Open the repo in VS Code and choose
**Dev Containers: Reopen in Container**.

First create both env files from their examples — see
[Environment files](#-environment-files).

On container creation, `.devcontainer/setup.sh` runs:

- `.devcontainer/db-setup.sh` — installs PostgreSQL 17 from Debian's own repos,
  starts the cluster, and creates the local `evencost` role and database
- `yarn install`

### 🔐 Environment files

Secrets are split by who needs them:

| File | Holds | Read by |
| :--- | :--- | :--- |
| `.devcontainer/.env` | `ANTHROPIC_*`, `CONTEXT7_API_KEY` | Claude Code, MCP servers |
| `.env` | `DATABASE_URL`, app secrets | the application |

Both are gitignored; matching `.env.example` files are committed.

> ⚠️ The local database lives in the container layer, so **its data is wiped on
> every rebuild**.

## 🗺️ Roadmap

- [ ] Scaffold Next.js
- [ ] Drizzle schema + migrations
- [ ] Auth
- [ ] Groups and members
- [ ] Expenses with splits
- [ ] Balances
- [ ] Netting — the minimal-transfer algorithm, documented in [`docs/`](docs/)

## 📚 Documentation

Anything that isn't in this file lives in [`docs/`](docs/) — start with
[Dev environment](docs/dev-environment.md).
