import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/**
 * `cache` memoises per request, so a page that reads the session in several
 * places does not hit the database for each one.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * For anything that requires being signed in. The redirect is a convenience, not
 * the security boundary: every action re-checks the session itself, because a
 * Server Action can be called directly with a POST.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/signin");
  return session;
}
