import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimits } from "./rate-limit";

const LIMIT = { limit: 3, windowMs: 60_000 };

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows up to the limit", () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(checkRateLimit("a", LIMIT).allowed).toBe(true);
    }
  });

  it("blocks the attempt after the limit", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) checkRateLimit("a", LIMIT);
    const blocked = checkRateLimit("a", LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key separately", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) checkRateLimit("a", LIMIT);
    expect(checkRateLimit("a", LIMIT).allowed).toBe(false);
    expect(checkRateLimit("b", LIMIT).allowed).toBe(true);
  });

  it("frees the key again once the window passes", () => {
    vi.useFakeTimers();
    for (let attempt = 0; attempt < 3; attempt += 1) checkRateLimit("a", LIMIT);
    expect(checkRateLimit("a", LIMIT).allowed).toBe(false);

    vi.advanceTimersByTime(LIMIT.windowMs + 1);
    expect(checkRateLimit("a", LIMIT).allowed).toBe(true);
  });
});
