import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { groups, inviteLinks, memberships } from "@/db/schema";

/**
 * An expired link and a revoked link are the same answer. Both mean "this link
 * does not work any more", and the person opening it can do nothing about it
 * (rule 13). A deleted group's link is dead too, or joining it would create a
 * membership in a group nobody can open.
 */
export async function findUsableInvite(token: string) {
  const [row] = await db
    .select({ invite: inviteLinks })
    .from(inviteLinks)
    .innerJoin(groups, eq(groups.id, inviteLinks.groupId))
    .where(and(eq(inviteLinks.token, token), isNull(groups.deletedAt)))
    .limit(1);

  const invite = row?.invite;
  if (!invite || invite.revokedAt) return null;
  if (invite.expiresAt.getTime() <= Date.now()) return null;
  return invite;
}

/**
 * Joins the group, or returns null when the link is not usable.
 *
 * Idempotent: opening the link while already an active member just gives the
 * group id back, so a second click creates nothing (rule 11). Somebody who left
 * and comes back through a fresh link is re-added rather than duplicated.
 */
export async function joinByToken(token: string, userId: string): Promise<string | null> {
  const invite = await findUsableInvite(token);
  if (!invite) return null;

  const [existing] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.groupId, invite.groupId), eq(memberships.userId, userId)))
    .limit(1);

  if (existing) {
    if (existing.leftAt) {
      await db
        .update(memberships)
        .set({ leftAt: null })
        .where(and(eq(memberships.groupId, invite.groupId), eq(memberships.userId, userId)));
    }
    return invite.groupId;
  }

  // Two clicks on the same link can race; the composite primary key makes the
  // second insert a no-op instead of an error (rule 11).
  await db.insert(memberships).values({ groupId: invite.groupId, userId }).onConflictDoNothing();
  return invite.groupId;
}
