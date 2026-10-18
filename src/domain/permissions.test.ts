import { describe, expect, it } from "vitest";
import {
  canDeleteExpense,
  canDeleteGroup,
  canEditExpense,
  canEditGroup,
  canLeaveGroup,
  canManageGroup,
  canReverseSettlement,
  canSettle,
  isActiveMember,
  type GroupView,
} from "./permissions";

const PAST = new Date("2026-01-01T00:00:00Z");

const group: GroupView = {
  ownerId: "owner",
  members: [
    { userId: "owner", leftAt: null },
    { userId: "member", leftAt: null },
    { userId: "gone", leftAt: PAST },
  ],
};

const live = { createdByUserId: "member", deletedAt: null };
const removed = { createdByUserId: "member", deletedAt: PAST };

describe("membership", () => {
  it("treats someone who left as a stranger", () => {
    expect(isActiveMember(group, "gone")).toBe(false);
    expect(isActiveMember(group, "member")).toBe(true);
    expect(isActiveMember(group, "outsider")).toBe(false);
  });
});

describe("expenses", () => {
  it("lets the creator edit, not the payer", () => {
    // The rule keys on the creator only; a payer is not passed in at all.
    expect(canEditExpense("member", group, live)).toBe(true);
    expect(canEditExpense("owner", group, live)).toBe(true);
    expect(canEditExpense("gone", group, live)).toBe(false);
  });

  it("refuses to edit an expense that is already deleted", () => {
    expect(canEditExpense("owner", group, removed)).toBe(false);
  });

  it("uses the same rule for delete", () => {
    expect(canDeleteExpense("member", group, live)).toBe(true);
    expect(canDeleteExpense("gone", group, live)).toBe(false);
  });

  it("refuses outsiders", () => {
    expect(canEditExpense("outsider", group, live)).toBe(false);
  });
});

describe("settlements", () => {
  it("lets any active member settle", () => {
    expect(canSettle("member", group)).toBe(true);
    expect(canSettle("gone", group)).toBe(false);
  });

  it("lets the owner or the sender reverse, nobody else", () => {
    const settlement = { fromUserId: "member", reversedAt: null };
    expect(canReverseSettlement("member", group, settlement)).toBe(true);
    expect(canReverseSettlement("owner", group, settlement)).toBe(true);
    expect(canReverseSettlement("gone", group, settlement)).toBe(false);
  });

  it("will not reverse twice", () => {
    expect(
      canReverseSettlement("owner", group, { fromUserId: "member", reversedAt: PAST }),
    ).toBe(false);
  });
});

describe("the group itself", () => {
  it("reserves management for the owner", () => {
    expect(canManageGroup("owner", group)).toBe(true);
    expect(canManageGroup("member", group)).toBe(false);
    expect(canDeleteGroup("member", group)).toBe(false);
    expect(canEditGroup("owner", group)).toBe(true);
    expect(canEditGroup("member", group)).toBe(false);
  });

  it("lets anyone but the owner leave", () => {
    expect(canLeaveGroup("member", group)).toBe(true);
    expect(canLeaveGroup("owner", group)).toBe(false);
  });

  it("does not let someone who already left leave again", () => {
    expect(canLeaveGroup("gone", group)).toBe(false);
  });
});
