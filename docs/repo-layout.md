# 🗂️ Repo layout

What every entry in the repository root is for. One line each — what lives
inside a folder is that folder's business, not this file's.

## Committed

| Path | What it is |
| :--- | :--- |
| [`README.md`](../README.md) | Project overview — what EvenCost does, the stack, setup, roadmap. |
| [`CLAUDE.md`](../CLAUDE.md) | Instructions for Claude Code. Imports `README.md`, so both are always in the agent's context. |
| [`AGENTS.md`](../AGENTS.md) | Written and re-added by `next dev`: a pointer that this Next version ships its docs in `node_modules`. Ignoring it only recreates the file. |
| [`src/`](../src/) | Application code — see [Project structure](#project-structure) below. |
| [`docs/`](.) | Everything that isn't in the README. |
| [`.devcontainer/`](../.devcontainer/) | Dev container definition and its setup scripts — see [Dev environment](dev-environment.md). |
| [`.github/`](../.github/) | CI: lint, typecheck and build on every push and pull request. |
| [`.gitignore`](../.gitignore) | What stays out of the repo; the ignored paths are listed below. |
| [`.env.example`](../.env.example) | Template for the application's `.env`. Copy it before the first run. |
| [`.mcp.json`](../.mcp.json) | MCP servers for Claude Code — currently Context7, for live library docs. |
| [`.claude/settings.json`](../.claude/settings.json) | Claude Code configuration: which provider and model answer. Not a secret, so it is committed. |
| [`package.json`](../package.json) | Scripts, dependencies and the Node version floor. |
| `package-lock.json` | Dependency lockfile — committed, so installs are reproducible. |
| [`next.config.ts`](../next.config.ts) | Next configuration. Cache Components and the Tailwind Turbopack rule live here. |
| [`tsconfig.json`](../tsconfig.json) | TypeScript config; `@/*` maps to `./src/*`. |
| [`eslint.config.mjs`](../eslint.config.mjs) | ESLint 9 flat config. `next lint` no longer exists, so linting is its own command. |
| [`drizzle/`](../drizzle/) | Generated SQL migrations and their snapshots. Committed, so the schema history is in git. |
| [`drizzle.config.ts`](../drizzle.config.ts) | drizzle-kit configuration. Migrations connect through `DIRECT_URL`, never the pooled URL. |
| [`components.json`](../components.json) | shadcn config. Its aliases point inside `src/`, or the CLI writes components to the wrong place. |

## Gitignored

These exist on a working machine but are deliberately absent from the repo.

| Path | What it holds | Why it is ignored |
| :--- | :--- | :--- |
| `.env` | Application secrets — `DATABASE_URL`. | Secrets. |
| `.devcontainer/.env` | Dev tooling secrets — `ANTHROPIC_AUTH_TOKEN`, `CONTEXT7_API_KEY`. | Secrets. |
| `node_modules/` | Installed dependencies. | Reproducible from the lockfile. |
| `.next/` | Next.js build output. | Generated. |
| `next-env.d.ts` | TypeScript declarations next generates. | Generated. |
| `dev-only/` | Scratch space — prototypes and experiments tied to no plan. | Not part of the product. |
| `.claude/plans/` | Implementation plans, one folder per plan. | Local to one machine. |

> ⚠️ `.env.*` ignores every env file at any depth, including the example files,
> so `!.env.example` re-includes them. That is why each secret ships a committed
> `.env.example` next to it.

## Project structure

Application code sits in `src/`; configuration and generated files stay at the
root, where Next.js looks for them.

```
src/
  domain/      pure TypeScript: splits, balances, netting, permissions
  db/          Drizzle schema and the database client
  components/  UI; components/ui is written by the shadcn CLI
  lib/         auth, validation, rate limiting, cn()
  app/         routes, layouts and Server Actions
  proxy.ts     Next 16 keeps this inside src/
```

The rule that matters: **`src/domain/` imports nothing from Next.js, React or the
database.** Business rules live there so they can be tested without a server.
