import { describe, expect, it } from "vitest";
import { formatMoney, toMinorUnits } from "./money";

describe("toMinorUnits", () => {
  it("parses plain amounts", () => {
    expect(toMinorUnits("420")).toBe(42000);
    expect(toMinorUnits("420.5")).toBe(42050);
    expect(toMinorUnits("420.55")).toBe(42055);
  });

  it("accepts a comma as the decimal separator", () => {
    expect(toMinorUnits("420,55")).toBe(42055);
  });

  it("rounds the way a float would not", () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(toMinorUnits("0.29")).toBe(29);
  });

  it("rejects anything that is not a plain amount", () => {
    for (const bad of ["", " ", "abc", "1.234", "-5", "1e3", "1,2,3", "12."]) {
      expect(toMinorUnits(bad)).toBeNull();
    }
  });
});

const plain = (value: string) => value.replace(/\u00a0/g, " ");

describe("formatMoney", () => {
  it("puts the currency code in front, the same way for every currency", () => {
    // Intl separates the code from the number with a non-breaking space, so the
    // comparison normalises it rather than pretending it is a plain space.
    expect(plain(formatMoney(29160, "PLN"))).toBe("PLN 291.60");
    expect(plain(formatMoney(167230, "EUR"))).toBe("EUR 1,672.30");
  });

  it("never uses a symbol, so no currency looks different from the rest", () => {
    expect(formatMoney(100, "EUR")).not.toContain("€");
  });

  it("falls back instead of throwing on a malformed code", () => {
    expect(formatMoney(12300, "NO")).toBe("NO 123.00");
  });
});
