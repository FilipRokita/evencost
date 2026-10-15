# 💸 EvenCost

Split shared expenses in a group — a trip, a flat, a project. Everyone adds what
they paid, and EvenCost works out who owes whom and the simplest way to settle.

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL_17-4169E1?logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-1C1C1C?logo=drizzle&logoColor=C5F74F)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

> 🚧 **Early development.** The dev environment is set up; application code has
> not been started yet.

## ✨ What it does

1. **Create a group** — a name, a description, one currency
2. **Invite people** with a single link; they sign up and land straight in
3. **Add expenses** — who paid, how much, and how to split it: equally, by exact
   amounts, or by percentage
4. **Watch the balances** update as expenses land
5. **Settle up** — EvenCost suggests an optimized set of transfers that clears
   the whole group, or you record a partial payment instead
6. **Everyone at zero** — done

Settlement is a recorded transfer, not a checkbox, so paying back half of what
you owe works properly.

**Mobile-first, dark by default.** Built for the phone in your pocket at the end
of the trip — bottom navigation, sheets instead of forms, and amounts you can
read at a glance.

## 🧱 Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui |
| Backend | Server Actions + Route Handlers |
| Database | PostgreSQL 17 — local to the dev container, any hosted Postgres in production |
| ORM | Drizzle |
| Auth | Better Auth |
| Dev environment | Dev Container (VS Code) |

The app reads its database from a single environment variable, so swapping the
local Postgres for a hosted one (Neon, Supabase) is a config change — not a code
change.

## 🚀 Run it locally

Everything runs inside the dev container; nothing is installed on your machine.

1. **Open the repo in the container.** In VS Code, run *Dev Containers: Reopen in
   Container*. On first creation this installs PostgreSQL 17, starts the
   cluster, creates the local `evencost` role and database, and runs
   `npm install`.

2. **Create the env files** — both are gitignored, so a fresh clone has neither:

   ```bash
   cp .env.example .env
   cp .devcontainer/.env.example .devcontainer/.env
   ```

   Fill in the values — the example files say what goes where, and
   [Dev environment](docs/dev-environment.md#two-env-files) explains why.

3. **(Optional) Seed demo data** — `npm run db:seed` fills the database with two
   demo groups to click through. Skip it to start empty. Sign in with
   `filip@evencost.test` / `devpassword`. ⏳ *Not yet — arrives with the database
   stage.* The database lives in the container layer, so it is wiped on every
   rebuild — re-run the seed to get it back.

4. **Start the dev server** — `npm run dev`, then open
   [http://localhost:3000](http://localhost:3000). ⏳ *Not yet — arrives with the
   scaffold.*

Dependencies and database migrations are not on this list on purpose — the
container runs them, on creation and on every start.

## 🗺️ Roadmap

- [ ] Scaffold Next.js + a documented getting-started path
- [ ] Drizzle schema + migrations
- [ ] Domain core — splits, balances, netting — with unit and property tests
- [ ] Auth
- [ ] Groups and invites
- [ ] Expenses
- [ ] Settlement
- [ ] Deploy

## 📚 Documentation

Anything that isn't in this file lives in [`docs/`](docs/).
