import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, groups, memberships, sessions, users, verifications } from "@/db/schema";

export type DeleteAccountResult = { ok: true } | { ok: false; error: "owns-shared-group" };

/**
 * Erases the person, keeps the books. The user row stays as "Deleted user" so
 * past expenses and balances still point at a real row (rule 1); everything that
 * identifies or signs them in is removed.
 *
 * Refused while they own a live group with other active members: ownership is
 * not transferable in v1 (decision 3), so the group would be left with no one
 * able to correct it.
 *
 * Extracted from the Server Action so it can be tested against a real database
 * without a request context.
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) return { ok: true };

    const [shared] = await tx
      .select({ id: groups.id })
      .from(groups)
      .innerJoin(memberships, eq(memberships.groupId, groups.id))
      .where(
        and(
          eq(groups.ownerId, userId),
          isNull(groups.deletedAt),
          isNull(memberships.leftAt),
          ne(memberships.userId, userId),
        ),
      )
      .limit(1);
    if (shared) return { ok: false, error: "owns-shared-group" };

    await tx
      .update(memberships)
      .set({ leftAt: sql`now()` })
      .where(and(eq(memberships.userId, userId), isNull(memberships.leftAt)));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(verifications).where(eq(verifications.identifier, user.email));
    await tx
      .update(users)
      .set({
        displayName: "Deleted user",
        // Unique and unusable: the column is NOT NULL UNIQUE, and `.invalid` can
        // never receive mail (RFC 2606).
        email: `deleted-${userId}@deleted.invalid`,
        emailVerified: false,
        image: null,
      })
      .where(eq(users.id, userId));

    return { ok: true };
  });
}
