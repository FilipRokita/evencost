"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { toMinorUnits } from "@/domain/money";
import { canReverseSettlement } from "@/domain/permissions";
import type { Transfer } from "@/domain/netting";
import type { FormState } from "@/lib/form-state";
import { getGroupForViewer, listMembers } from "@/lib/groups";
import { recordSuggestedTransfers } from "@/lib/settle";
import { requireSession } from "@/lib/session";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** The cap protects against a client sending an unbounded list. */
const MAX_TRANSFERS = 50;

function revalidate(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
}

/**
 * Records the transfers the app suggested.
 *
 * The suggested amounts were computed from a view that may already be stale, so
 * they are recomputed under a lock on the group row: two people settling at the
 * same moment run one after the other, and the second one is capped at what is
 * still owed rather than settling the same debt twice (rule 14).
 */
export async function recordTransfersAction(
  groupId: string,
  transfers: Transfer[],
): Promise<FormState> {
  const session = await requireSession();
  if (!z.uuid().safeParse(groupId).success) return { error: "That group is not yours." };
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group) return { error: "That group is not yours." };
  if (transfers.length === 0) return { error: "Pick at least one transfer." };
  if (transfers.length > MAX_TRANSFERS) return { error: "Too many transfers at once." };

  // Both sides have to be members, but not necessarily active: somebody who
  // left with a balance still has a debt to clear (rule 1a).
  const members = await listMembers(groupId);
  const memberIds = new Set(members.map((member) => member.id));

  for (const transfer of transfers) {
    if (transfer.fromUserId === transfer.toUserId) return { error: "A transfer needs two people." };
    if (!memberIds.has(transfer.fromUserId) || !memberIds.has(transfer.toUserId)) {
      return { error: "Both people have to be in the group." };
    }
    if (!Number.isInteger(transfer.amountMinor) || transfer.amountMinor <= 0) {
      return { error: "Every amount has to be positive." };
    }
  }

  const recorded = await recordSuggestedTransfers(groupId, transfers);

  revalidate(groupId);
  return recorded > 0
    ? { success: `${recorded} transfer${recorded === 1 ? "" : "s"} recorded.` }
    : { error: "Nothing left to settle. Someone got there first." };
}

const customSchema = z.object({
  groupId: z.uuid("Pick a group."),
  fromUserId: z.uuid("Pick who paid."),
  toUserId: z.uuid("Pick who was paid."),
  amount: z.string().min(1, "Enter an amount."),
  note: z.string().trim().max(120, "At most 120 characters."),
});

/**
 * A transfer recorded by hand. Overpaying is allowed: it leaves the sender in
 * credit, which is a real thing that happens when someone advances money.
 */
export async function recordTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const parsed = customSchema.safeParse({
    groupId: field(formData, "groupId"),
    fromUserId: field(formData, "fromUserId"),
    toUserId: field(formData, "toUserId"),
    amount: field(formData, "amount"),
    note: field(formData, "note"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const groupId = parsed.data.groupId;
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group) return { error: "That group is not yours." };

  if (parsed.data.fromUserId === parsed.data.toUserId) {
    return { error: "Pick two different people." };
  }

  const amount = toMinorUnits(parsed.data.amount);
  if (amount === null || amount <= 0) {
    return { fieldErrors: { amount: ["Enter an amount greater than zero."] } };
  }

  // A departed member can still be paid back, so the counterparties only have
  // to have a membership row.
  const members = await listMembers(groupId);
  const memberIds = new Set(members.map((member) => member.id));
  if (!memberIds.has(parsed.data.fromUserId) || !memberIds.has(parsed.data.toUserId)) {
    return { error: "Both people have to be in the group." };
  }

  await db.insert(settlements).values({
    groupId,
    fromUserId: parsed.data.fromUserId,
    toUserId: parsed.data.toUserId,
    amountMinor: amount,
    note: parsed.data.note || "custom transfer",
  });

  revalidate(groupId);
  return { success: "Transfer recorded." };
}

/** Owner or the sender, and never twice. History stays (rule 2). */
export async function reverseSettlementAction(settlementId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(settlementId).success) return;
  const [settlement] = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);
  if (!settlement) return;

  const group = await getGroupForViewer(settlement.groupId, session.user.id);
  if (!group) return;

  const members = await listMembers(settlement.groupId);
  const allowed = canReverseSettlement(
    session.user.id,
    { ownerId: group.ownerId, members: members.map((m) => ({ userId: m.id, leftAt: m.leftAt })) },
    settlement,
  );
  if (!allowed) return;

  await db.update(settlements).set({ reversedAt: new Date() }).where(eq(settlements.id, settlementId));
  revalidate(settlement.groupId);
}
