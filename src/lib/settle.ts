import { sql } from "drizzle-orm";
import { db } from "@/db";
import { groups, settlements } from "@/db/schema";
import type { Transfer } from "@/domain/netting";
import { loadBalances } from "./groups";

/**
 * Records suggested transfers, returning how many were actually stored.
 *
 * The suggestions come from a view that may already be stale by the time they
 * are confirmed, so the balances are recomputed under a lock on the group row.
 * Two people tapping "settle" at the same moment run one after the other, and
 * the second is capped at what is still owed instead of settling the same debt
 * twice (rule 14).
 *
 * Extracted from the Server Action so it can be tested against a real database
 * without a request context.
 */
export async function recordSuggestedTransfers(
  groupId: string,
  transfers: readonly Transfer[],
): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT 1 FROM ${groups} WHERE ${groups.id} = ${groupId} FOR UPDATE`);

    const balances = await loadBalances(groupId, tx);
    const rows: (typeof settlements.$inferInsert)[] = [];

    for (const transfer of transfers) {
      const senderDebt = -(balances[transfer.fromUserId] ?? 0);
      const receiverClaim = balances[transfer.toUserId] ?? 0;
      const amount = Math.min(transfer.amountMinor, senderDebt, receiverClaim);
      if (amount <= 0) continue;

      balances[transfer.fromUserId] += amount;
      balances[transfer.toUserId] -= amount;
      rows.push({
        groupId,
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        amountMinor: amount,
        note: "settle up",
      });
    }

    if (rows.length > 0) await tx.insert(settlements).values(rows);
    return rows.length;
  });
}
