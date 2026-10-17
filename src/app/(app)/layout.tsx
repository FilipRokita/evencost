import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireSession } from "@/lib/session";

// Everything here needs the session, so these routes block rather than stream a
// placeholder that would be replaced a moment later.
export const instant = false;

/**
 * The gate for everything under this route group. It redirects, but it is not
 * the security boundary: each Server Action checks the session again, because
 * actions can be posted to directly.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // The session only exists per request, so there is nothing to prerender. With
  // Cache Components this replaces `dynamic = "force-dynamic"`, which Next 16
  // rejects outright (rule 12).
  await connection();
  await requireSession();
  return <>{children}</>;
}
