"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { expenseSplits, expenses } from "@/db/schema";
import { CATEGORIES, type Category } from "@/domain/categories";
import { toMinorUnits } from "@/domain/money";
import { canDeleteExpense, canEditExpense, type GroupView } from "@/domain/permissions";
import type { SplitResult } from "@/domain/splits";
import { splitByPercent, splitEqually, splitExact } from "@/domain/splits";
import type { FormState } from "@/lib/form-state";
import { getGroupForViewer, listMembers } from "@/lib/groups";
import { requireSession } from "@/lib/session";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const base = z.object({
  title: z.string().trim().min(1, "Say what it was.").max(80, "At most 80 characters."),
  category: z.enum(CATEGORIES),
  spentOn: z.iso.date("Pick a date."),
});

type SplitInput =
  | { mode: "equal"; participants: string[] }
  | { mode: "exact"; parts: Record<string, number> }
  | { mode: "percent"; parts: Record<string, number> };

/** Reads the split fields. The arithmetic itself belongs to the domain. */
function readSplit(formData: FormData): { input: SplitInput } | { error: string } {
  const mode = field(formData, "mode");
  const participants = formData
    .getAll("participant")
    .filter((value): value is string => typeof value === "string");

  if (participants.length === 0) return { error: "Pick at least one person." };
  if (mode === "equal") return { input: { mode: "equal", participants } };
  if (mode !== "exact" && mode !== "percent") return { error: "Pick a split mode." };

  const parts: Record<string, number> = {};
  for (const userId of participants) {
    const raw = field(formData, `part:${userId}`);
    const value = mode === "exact" ? toMinorUnits(raw) : Number.parseFloat(raw.replace(",", "."));
    if (value === null || !Number.isFinite(value)) return { error: "Fill in every share." };
    parts[userId] = value;
  }

  return mode === "exact"
    ? { input: { mode: "exact", parts } }
    : { input: { mode: "percent", parts } };
}

function computeSplits(input: SplitInput, total: number): SplitResult {
  if (input.mode === "equal") return splitEqually(total, input.participants);
  if (input.mode === "exact") return splitExact(total, input.parts);
  return splitByPercent(total, input.parts);
}

const MESSAGES: Record<string, string> = {
  "no-participants": "Pick at least one person.",
  "invalid-total": "Enter a valid amount.",
  "invalid-part": "Every share has to be zero or more.",
  "parts-do-not-sum": "The shares have to add up to the total.",
  "percents-do-not-sum": "The percentages have to add up to 100.",
};

export async function saveExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const groupId = field(formData, "groupId");
  if (!z.uuid().safeParse(groupId).success) return { error: "That group is not yours." };
  const group = await getGroupForViewer(groupId, session.user.id);
  if (!group) return { error: "That group is not yours." };

  const parsed = base.safeParse({
    title: field(formData, "title"),
    category: field(formData, "category"),
    spentOn: field(formData, "spentOn"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const amount = toMinorUnits(field(formData, "amount"));
  if (amount === null || amount <= 0) {
    return { fieldErrors: { amount: ["Enter an amount greater than zero."] } };
  }

  const members = await listMembers(groupId);
  const groupView: GroupView = {
    ownerId: group.ownerId,
    members: members.map((member) => ({ userId: member.id, leftAt: member.leftAt })),
  };
  const activeIds = new Set(
    members.filter((member) => member.leftAt === null).map((member) => member.id),
  );

  const expenseId = field(formData, "expenseId");
  if (expenseId && !z.uuid().safeParse(expenseId).success) {
    return { error: "That expense is not in this group." };
  }
  const category = parsed.data.category as Category;

  // A new expense can only involve active members. An edit may also keep the
  // people already on that expense, so a departure does not freeze history
  // (rule 1). The form is never the boundary; both cases are enforced here.
  const allowedIds = new Set(activeIds);
  if (expenseId) {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
    if (!existing || existing.groupId !== groupId) {
      return { error: "That expense is not in this group." };
    }
    if (!canEditExpense(session.user.id, groupView, existing)) {
      return { error: "Only the person who added it, or the group owner, can change this." };
    }

    const existingSplits = await db
      .select({ userId: expenseSplits.userId })
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, expenseId));
    allowedIds.add(existing.paidByUserId);
    for (const split of existingSplits) allowedIds.add(split.userId);
  }

  const paidByUserId = field(formData, "paidByUserId");
  if (!allowedIds.has(paidByUserId)) {
    return { fieldErrors: { paidByUserId: ["The payer has to be in the group."] } };
  }

  const split = readSplit(formData);
  if ("error" in split) return { error: split.error };

  const participants =
    split.input.mode === "equal" ? split.input.participants : Object.keys(split.input.parts);
  if (participants.some((id) => !allowedIds.has(id))) {
    return { error: "Everyone in the split has to be in the group." };
  }

  const result = computeSplits(split.input, amount);
  if (!result.ok) return { error: MESSAGES[result.error] ?? "The split does not add up." };
  if (Object.values(result.splits).reduce((sum, value) => sum + value, 0) !== amount) {
    // Belt and braces: the domain promises this, and the transaction must never
    // store splits that disagree with the amount (rule 9).
    return { error: "The split does not add up." };
  }

  await db.transaction(async (tx) => {
    if (expenseId) {
      await tx
        .update(expenses)
        .set({
          title: parsed.data.title,
          category,
          amountMinor: amount,
          paidByUserId,
          spentOn: parsed.data.spentOn,
        })
        .where(eq(expenses.id, expenseId));

      // Editing replaces every split, so nothing stale survives the change.
      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
      await tx.insert(expenseSplits).values(
        Object.entries(result.splits).map(([userId, amountMinor]) => ({
          expenseId,
          groupId,
          userId,
          amountMinor,
        })),
      );
      return;
    }

    const [created] = await tx
      .insert(expenses)
      .values({
        groupId,
        title: parsed.data.title,
        category,
        amountMinor: amount,
        paidByUserId,
        createdByUserId: session.user.id,
        spentOn: parsed.data.spentOn,
      })
      .returning({ id: expenses.id });

    await tx.insert(expenseSplits).values(
      Object.entries(result.splits).map(([userId, amountMinor]) => ({
        expenseId: created.id,
        groupId,
        userId,
        amountMinor,
      })),
    );
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { success: expenseId ? "Expense updated." : "Expense added." };
}

export async function deleteExpenseAction(expenseId: string): Promise<void> {
  const session = await requireSession();
  if (!z.uuid().safeParse(expenseId).success) return;
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense) return;

  const group = await getGroupForViewer(expense.groupId, session.user.id);
  if (!group) return;

  const members = await listMembers(expense.groupId);
  const allowed = canDeleteExpense(
    session.user.id,
    { ownerId: group.ownerId, members: members.map((m) => ({ userId: m.id, leftAt: m.leftAt })) },
    expense,
  );
  if (!allowed) return;

  // Soft delete: it leaves the balances but stays in the history (decision 4).
  await db.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));

  revalidatePath(`/groups/${expense.groupId}`);
  revalidatePath("/dashboard");
}
