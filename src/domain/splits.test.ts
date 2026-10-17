import { describe, expect, it } from "vitest";
import { splitByPercent, splitEqually, splitExact, type SplitResult } from "./splits";

function ok(result: SplitResult): Record<string, number> {
  if (!result.ok) throw new Error(`expected a split, got ${result.error}`);
  return result.splits;
}

const total = (splits: Record<string, number>) =>
  Object.values(splits).reduce((sum, value) => sum + value, 0);

describe("splitEqually", () => {
  it("divides evenly when it divides", () => {
    expect(ok(splitEqually(900, ["a", "b", "c"]))).toEqual({ a: 300, b: 300, c: 300 });
  });

  it("hands the leftover cents out one each", () => {
    const splits = ok(splitEqually(100, ["a", "b", "c"]));
    expect(splits).toEqual({ a: 34, b: 33, c: 33 });
    expect(total(splits)).toBe(100);
  });

  it("rejects an empty group", () => {
    expect(splitEqually(100, [])).toEqual({ ok: false, error: "no-participants" });
  });

  it("is deterministic", () => {
    expect(splitEqually(101, ["a", "b", "c"])).toEqual(splitEqually(101, ["a", "b", "c"]));
  });

  it("property: parts always add up and differ by at most one", () => {
    for (let run = 0; run < 1000; run += 1) {
      const people = 1 + Math.floor(Math.random() * 12);
      const amount = Math.floor(Math.random() * 1_000_000);
      const ids = Array.from({ length: people }, (_, i) => `u${i}`);

      const splits = ok(splitEqually(amount, ids));
      const values = Object.values(splits);

      expect(total(splits)).toBe(amount);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      expect(values.every((v) => v >= 0)).toBe(true);
    }
  });
});

describe("splitExact", () => {
  it("accepts parts that add up", () => {
    expect(ok(splitExact(100, { a: 60, b: 40 }))).toEqual({ a: 60, b: 40 });
  });

  it("rejects parts that do not add up", () => {
    expect(splitExact(100, { a: 60, b: 39 })).toEqual({ ok: false, error: "parts-do-not-sum" });
  });

  it("rejects negative parts", () => {
    expect(splitExact(100, { a: 120, b: -20 })).toEqual({ ok: false, error: "invalid-part" });
  });
});

describe("splitByPercent", () => {
  it("splits by percentage", () => {
    const splits = ok(splitByPercent(10_000, { a: 50, b: 25, c: 25 }));
    expect(splits).toEqual({ a: 5000, b: 2500, c: 2500 });
  });

  it("rejects percentages that do not add up to 100", () => {
    expect(splitByPercent(1000, { a: 50, b: 40 })).toEqual({
      ok: false,
      error: "percents-do-not-sum",
    });
  });

  it("gives a 0% participant exactly zero, never a leftover cent", () => {
    // 100 split three ways leaves a cent over; it must not land on `c`.
    const splits = ok(splitByPercent(100, { a: 50, b: 50, c: 0 }));
    expect(splits.c).toBe(0);
    expect(total(splits)).toBe(100);
  });

  it("property: total is preserved and 0% stays at zero", () => {
    for (let run = 0; run < 1000; run += 1) {
      const amount = Math.floor(Math.random() * 1_000_000);
      const b = 1 + Math.floor(Math.random() * 99);
      const splits = ok(splitByPercent(amount, { a: 0, b, c: 100 - b }));

      expect(splits.a).toBe(0);
      expect(total(splits)).toBe(amount);
      expect(Object.values(splits).every((v) => v >= 0)).toBe(true);
    }
  });

  it("property: percentages that add to 100 always split exactly", () => {
    for (let run = 0; run < 1000; run += 1) {
      const amount = Math.floor(Math.random() * 1_000_000);
      const first = Math.floor(Math.random() * 101);
      const second = Math.floor(Math.random() * (101 - first));
      const splits = ok(splitByPercent(amount, { a: first, b: second, c: 100 - first - second }));
      expect(total(splits)).toBe(amount);
    }
  });
});
