import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load .env on its own. Locally the file exists; in CI and
// on a host the variables come from the real environment, so a missing file is
// not an error.
try {
  process.loadEnvFile();
} catch {
  // no .env; fall through to the process environment
}

// `||`, not `??`: .env.example ships `DIRECT_URL=` empty, and an empty string is a
// value to `??`, which would skip the fallback to DATABASE_URL.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL is set.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the unpooled connection: a transaction-mode pooler cannot run
  // them. The application itself uses the pooled DATABASE_URL (rule 2).
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
