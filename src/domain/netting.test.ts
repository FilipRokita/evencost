import { describe, expect, it } from "vitest";
import { netting, type Transfer } from "./netting";

/** Applies transfers the way computeBalances does, to see if they clear it. */
function apply(balances: Record<string, number>, transfers: Transfer[]): Record<string, number> {
  const result = { ...balances };
  for (const t of transfers) {
    result[t.fromUserId] += t.amountMinor;
    result[t.toUserId] -= t.amountMinor;
  }
  return result;
}

describe("netting", () => {
  it("settles a simple debt with one transfer", () => {
    expect(netting({ a: 500, b: -500 })).toEqual([
      { fromUserId: "b", toUserId: "a", amountMinor: 500 },
    ]);
  });

  it("collapses a chain into fewer transfers", () => {
    // b owes a, c owes b. One transfer each way would be silly; a and c settle.
    const transfers = netting({ a: 300, b: 0, c: -300 });
    expect(transfers).toEqual([{ fromUserId: "c", toUserId: "a", amountMinor: 300 }]);
  });

  it("returns nothing when everybody is even", () => {
    expect(netting({ a: 0, b: 0 })).toEqual([]);
  });

  it("never needs more than n-1 transfers", () => {
    for (let run = 0; run < 1000; run += 1) {
      const people = 2 + Math.floor(Math.random() * 8);
      const ids = Array.from({ length: people }, (_, i) => `u${i}`);
      const balances: Record<string, number> = {};
      let sum = 0;
      for (const id of ids) {
        const value = Math.floor(Math.random() * 20000) * (Math.random() < 0.5 ? 1 : -1);
        balances[id] = value;
        sum += value;
      }
      balances[ids[0]] -= sum; // force the books to balance

      const transfers = netting(balances);
      expect(transfers.length).toBeLessThanOrEqual(people - 1);
      expect(Object.values(apply(balances, transfers)).every((v) => v === 0)).toBe(true);
    }
  });

  it("is deterministic", () => {
    const balances = { a: 500, b: 300, c: -400, d: -400 };
    expect(netting(balances)).toEqual(netting(balances));
  });
});
