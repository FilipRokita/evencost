import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // The adapter looks models up by name. Our exports are plural and the user
    // table is ours, so the mapping is spelled out rather than guessed from
    // conventions.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  // Our ids are UUIDs, so the library must generate them the same way.
  advanced: { database: { generateId: "uuid" } },

  user: {
    // Better Auth calls it `name`; in this app it is the nickname shown
    // everywhere, and it is what the column is named.
    fields: { name: "displayName" },
    additionalFields: {
      // Never accepted from the client and never recomputed: set once, at signup.
      avatarColor: { type: "string", required: false, input: false, defaultValue: "teal" },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Better Auth defaults to scrypt. OWASP ranks Argon2id first, and this is the
    // one piece of security the app owns rather than delegates.
    password: { hash: hashPassword, verify: verifyPassword },
  },

  // Lets a Server Action set the session cookie; without it, signing in from an
  // action leaves the browser without a session. Must stay last.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
