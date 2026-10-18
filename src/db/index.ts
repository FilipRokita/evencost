import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env; the dev container creates the database for you.",
  );
}

/**
 * `prepare: false` from day one, locally too: prepared statements break behind a
 * transaction-mode pooler, and running the same setting everywhere means the
 * deployed path is the one that gets exercised. The pool connects lazily, on the
 * first query, so importing this module has no side effects.
 *
 * In development HMR re-evaluates this module. A fresh client each time would
 * leak connections until Postgres refuses new ones, so reuse one across reloads.
 */
const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
};

const client = globalForDb.postgresClient ?? postgres(url, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
