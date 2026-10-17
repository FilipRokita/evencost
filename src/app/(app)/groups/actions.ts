"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { groups, inviteLinks, memberships } from "@/db/schema";
import { CURRENCIES } from "@/domain/currencies";
import type { FormState } from "@/lib/form-state";
import { getGroupForViewer, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";

const INVITE_TTL_DAYS = 30;

function newToken(): string {
  // 16 random bytes, base64url: not guessable and not sequential.
  return randomBytes(16).toString("base64url");
}

function expiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalid(groupId: string): never {
  return redirect(`/groups/${groupId}`);
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(60, "At most 60 characters."),
  description: z.string().trim().max(200, "At most 200 characters."),
  currency: z.enum(CURRENCIES),
});

export async function createGroupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();

  const parsed = createSchema.safeParse({
    name: field(formData, "name"),
    description: field(formData, "description"),
    currency: field(formData, "currency"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const groupId = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: parsed.data.name,
        description: parsed.data.description,
        currency: parsed.data.currency,
        ownerId: session.user.id,
      })
      .returning({ id: groups.id });

    await tx.insert(memberships).values({ groupId: group.id, userId: session.user.id });
    await tx.insert(inviteLinks).values({
      groupId: group.id,
      token: newToken(),
      expiresAt: expiry(),
    });

    return group.id;
  });

  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

/** Revokes the current link and issues a new one, in one transaction. */
export async function regenerateInviteAction(groupId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(groupId).success) redirect("/dashboard");
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group || group.ownerId !== session.user.id) invalid(groupId);

  await db.transaction(async (tx) => {
    await tx
      .update(inviteLinks)
      .set({ revokedAt: new Date() })
      .where(and(eq(inviteLinks.groupId, groupId), isNull(inviteLinks.revokedAt)));

    await tx.insert(inviteLinks).values({ groupId, token: newToken(), expiresAt: expiry() });
  });

  revalidatePath(`/groups/${groupId}`);
}

/** Soft leave: the row stays, so past expenses still point at a real person. */
export async function leaveGroupAction(groupId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(groupId).success) redirect("/dashboard");
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group) invalid(groupId);
  // Owners cannot leave: there is no ownership transfer in v1 (decision 3).
  if (group.ownerId === session.user.id) invalid(groupId);

  await db
    .update(memberships)
    .set({ leftAt: new Date() })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, session.user.id)));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Owner only, and only once the person's balance is zero (rule 1). */
export async function removeMemberAction(groupId: string, userId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(groupId).success) redirect("/dashboard");
  if (!z.uuid().safeParse(userId).success) invalid(groupId);
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group || group.ownerId !== session.user.id) invalid(groupId);
  if (userId === session.user.id) invalid(groupId);

  await db.transaction(async (tx) => {
    // The balance read and the leave must see the same state, or a concurrent
    // change could leave the group with an unreachable debt (rule 1).
    await tx.execute(sql`SELECT 1 FROM ${groups} WHERE ${groups.id} = ${groupId} FOR UPDATE`);

    const [target] = await tx
      .select({ leftAt: memberships.leftAt })
      .from(memberships)
      .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)))
      .limit(1);
    if (!target || target.leftAt) invalid(groupId);

    const balances = await loadBalances(groupId, tx);
    if ((balances[userId] ?? 0) !== 0) invalid(groupId);

    await tx
      .update(memberships)
      .set({ leftAt: new Date() })
      .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, userId)));
  });

  revalidatePath(`/groups/${groupId}`);
}

/** Soft delete: members lose access, the history survives (rule 6). */
export async function deleteGroupAction(groupId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(groupId).success) redirect("/dashboard");
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group || group.ownerId !== session.user.id) invalid(groupId);

  await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
