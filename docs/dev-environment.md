# Dev environment

How the development environment is put together, and the traps in it.

Everything runs inside a dev container — open the repo in VS Code and choose
**Dev Containers: Reopen in Container**.

## Two env files

Configuration is split by who consumes it:

| File | Holds | Read by |
| :--- | :--- | :--- |
| `.devcontainer/.env` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `CONTEXT7_API_KEY` | Claude Code, MCP servers |
| `.env` | `DATABASE_URL`, app secrets | the application |

The split exists so the application process never carries the agent's
credentials — a token it has no use for and could leak through a log or a stack
trace. Both files are gitignored, with committed `.env.example` counterparts.

`.devcontainer/.env` reaches the container through `runArgs --env-file`, whose
path resolves relative to the repo root. The application reads its own root
`.env` through Next.js and needs no `--env-file` at all.

Settings that are not secret do not belong in either file — they go in
[`.claude/settings.json`](../.claude/settings.json), which is committed.

## Claude Code on DeepSeek

Claude Code runs inside the container, pointed at DeepSeek's
Anthropic-compatible API rather than Anthropic's own. DeepSeek serves two
models: `deepseek-flash` and `deepseek-v4-pro`.

**The model is set in [`.claude/settings.json`](../.claude/settings.json).**
Change it there:

```json
{ "env": { "ANTHROPIC_MODEL": "deepseek-flash[1m]" } }
```

The model is not a secret and is the setting most likely to change, so it lives
in a committed file rather than the gitignored one. A change takes effect on the
next launch, with no rebuild.

For a single run, override it in the shell instead:

```bash
ANTHROPIC_MODEL=deepseek-v4-pro claude
```

The credentials stay in `.devcontainer/.env`, read once when the container is
created:

| Variable | Value |
| :--- | :--- |
| `ANTHROPIC_BASE_URL` | `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_AUTH_TOKEN` | DeepSeek API key |
| `CONTEXT7_API_KEY` | Context7 key — optional, only raises rate limits |

MCP servers come from [`.mcp.json`](../.mcp.json) at the repository root —
currently Context7, which serves up-to-date library documentation.

## The dev container

On creation, `.devcontainer/setup.sh` runs:

- `.devcontainer/db-setup.sh` — installs PostgreSQL 17 from Debian's own repos,
  starts the cluster, creates the local `evencost` role and database
- `yarn install`

`.devcontainer/db-setup.sh` starts the cluster explicitly. The Debian package
creates it but leaves it stopped, because nothing in a container runs the init
system that would normally start it.

`setup.sh` runs on container **creation only**, so it does not re-run after a
plain restart. `postStartCommand` covers that gap by bringing the cluster back
up on every start. Its trailing `|| true` is deliberate: on a rebuild
`db-setup.sh` has already started the cluster, and `pg_ctlcluster` exits non-zero
when it finds it running.

## Gotchas

**PostgreSQL comes from Debian's own repositories, not PGDG.** Debian 13
(trixie) ships PostgreSQL 17 as its default, so the third-party repository and
its signing key are unnecessary. Reach for PGDG only when a version other than
Debian's is wanted.
