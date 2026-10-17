import { describe, expect, it } from "vitest";
import { computeBalances, outstandingTotal, type ExpenseInput, type SettlementInput } from "./balances";

const PAST = new Date("2026-01-01T00:00:00Z");

function expense(
  amountMinor: number,
  paidByUserId: string,
  splits: Record<string, number>,
  deletedAt: Date | null = null,
): ExpenseInput {
  return {
    amountMinor,
    paidByUserId,
    splits: Object.entries(splits).map(([userId, amountMinor]) => ({ userId, amountMinor })),
    deletedAt,
  };
}

function settlement(
  fromUserId: string,
  toUserId: string,
  amountMinor: number,
  reversedAt: Date | null = null,
): SettlementInput {
  return { fromUserId, toUserId, amountMinor, reversedAt };
}

const round = (balances: Record<string, number>) =>
  Object.fromEntries(Object.entries(balances).filter(([, value]) => value !== 0));

describe("computeBalances", () => {
  it("credits the payer and debits everyone they covered", () => {
    const balances = computeBalances(
      [expense(900, "a", { a: 300, b: 300, c: 300 })],
      [],
      ["a", "b", "c"],
    );
    expect(round(balances)).toEqual({ a: 600, b: -300, c: -300 });
  });

  it("adds up across several expenses", () => {
    const balances = computeBalances(
      [
        expense(900, "a", { a: 300, b: 300, c: 300 }),
        expense(300, "b", { a: 100, b: 100, c: 100 }),
      ],
      [],
      ["a", "b", "c"],
    );
    expect(round(balances)).toEqual({ a: 500, b: -100, c: -400 });
  });

  it("ignores soft-deleted expenses", () => {
    const balances = computeBalances(
      [
        expense(900, "a", { a: 300, b: 300, c: 300 }),
        expense(600, "a", { a: 200, b: 200, c: 200 }, PAST),
      ],
      [],
      ["a", "b", "c"],
    );
    expect(round(balances)).toEqual({ a: 600, b: -300, c: -300 });
  });

  it("moves both sides toward zero when somebody pays", () => {
    const balances = computeBalances(
      [expense(900, "a", { a: 300, b: 300, c: 300 })],
      [settlement("b", "a", 300)],
      ["a", "b", "c"],
    );
    // b owed 300, paid it: now at zero. a was owed 600, received 300: down to 300.
    expect(round(balances)).toEqual({ a: 300, c: -300 });
  });

  it("ignores reversed settlements", () => {
    const balances = computeBalances(
      [expense(900, "a", { a: 300, b: 300, c: 300 })],
      [settlement("b", "a", 300, PAST)],
      ["a", "b", "c"],
    );
    expect(round(balances)).toEqual({ a: 600, b: -300, c: -300 });
  });

  it("always sums to zero", () => {
    const balances = computeBalances(
      [
        expense(25200, "c", { a: 8400, b: 8400, c: 8400 }),
        expense(75000, "d", { a: 20000, b: 20000, c: 20000, d: 15000 }),
      ],
      [settlement("a", "d", 5000)],
      ["a", "b", "c", "d"],
    );
    expect(Object.values(balances).reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it("reports what the group still has to move", () => {
    const balances = computeBalances(
      [expense(900, "a", { a: 300, b: 300, c: 300 })],
      [settlement("b", "a", 100)],
      ["a", "b", "c"],
    );
    // a is up 500; b is down 200 and c down 300. The debt still outstanding is
    // what the creditors are owed, so 500.
    expect(outstandingTotal(balances)).toBe(500);
  });
});
