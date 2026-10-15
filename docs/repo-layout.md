# 🗂️ Repo layout

What every entry in the repository root is for. One line each — what lives
inside a folder is that folder's business, not this file's.

## Committed

| Path | What it is |
| :--- | :--- |
| [`README.md`](../README.md) | Project overview — what EvenCost does, the stack, setup, roadmap. |
| [`CLAUDE.md`](../CLAUDE.md) | Instructions for Claude Code. Imports `README.md`, so both are always in the agent's context. |
| [`docs/`](.) | Everything that isn't in the README. |
| [`.devcontainer/`](../.devcontainer/) | Dev container definition and its setup scripts — see [Dev environment](dev-environment.md). |
| [`.gitignore`](../.gitignore) | What stays out of the repo; the ignored paths are listed below. |
| [`.env.example`](../.env.example) | Template for the application's `.env`. Copy it before the first run. |
| [`.mcp.json`](../.mcp.json) | MCP servers for Claude Code — currently Context7, for live library docs. |
| [`.claude/settings.json`](../.claude/settings.json) | Claude Code configuration: which provider and model answer. Not a secret, so it is committed. |
| [`yarn.lock`](../yarn.lock) | Dependency lockfile. Empty until the app is scaffolded. |

## Gitignored

These exist on a working machine but are deliberately absent from the repo.

| Path | What it holds | Why it is ignored |
| :--- | :--- | :--- |
| `.env` | Application secrets — `DATABASE_URL`. | Secrets. |
| `.devcontainer/.env` | Dev tooling secrets — `ANTHROPIC_AUTH_TOKEN`, `CONTEXT7_API_KEY`. | Secrets. |
| `node_modules/` | Installed dependencies. | Reproducible from the lockfile. |
| `.next/` | Next.js build output. | Generated. |
| `dev-only/` | Scratch space — prototypes and experiments tied to no plan. | Not part of the product. |
| `.claude/plans/` | Implementation plans, one folder per plan. | Local to one machine. |

> ⚠️ The same `.gitignore` rule covers both `.env` files — the pattern has no
> leading slash, so it matches at any depth. Anything named `.env` is ignored,
> which is why each one ships a committed `.env.example` next to it.
