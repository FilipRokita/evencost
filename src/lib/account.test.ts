import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, groups, memberships, sessions, users, verifications } from "@/db/schema";
import { deleteAccount } from "./account";

const createdGroups: string[] = [];
const createdUsers: string[] = [];

async function makeUser(name: string): Promise<{ id: string; email: string }> {
  const email = `${name}-${randomUUID()}@account.test`;
  const [user] = await db
    .insert(users)
    .values({ email, displayName: name, image: "https://example.test/me.png" })
    .returning({ id: users.id });
  createdUsers.push(user.id);
  return { id: user.id, email };
}

async function makeGroup(owner: string, members: string[]): Promise<string> {
  const [group] = await db
    .insert(groups)
    .values({ name: `account-${randomUUID()}`, currency: "PLN", ownerId: owner })
    .returning({ id: groups.id });
  createdGroups.push(group.id);
  await db
    .insert(memberships)
    .values([owner, ...members].map((userId) => ({ groupId: group.id, userId })));
  return group.id;
}

afterAll(async () => {
  for (const id of createdGroups) await db.delete(groups).where(eq(groups.id, id));
  for (const id of createdUsers) await db.delete(users).where(eq(users.id, id));
});

describe("deleteAccount", () => {
  it("anonymizes the user and removes everything that can sign them in", async () => {
    const owner = await makeUser("Owner");
    const leaver = await makeUser("Leaver");
    const groupId = await makeGroup(owner.id, [leaver.id]);
    await db.insert(accounts).values({
      accountId: leaver.id,
      providerId: "credential",
      userId: leaver.id,
      password: "hash",
    });
    await db.insert(sessions).values({
      token: randomUUID(),
      userId: leaver.id,
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: "203.0.113.7",
      userAgent: "test",
    });
    await db.insert(verifications).values({
      identifier: leaver.email,
      value: "token",
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(await deleteAccount(leaver.id)).toEqual({ ok: true });

    const [row] = await db.select().from(users).where(eq(users.id, leaver.id));
    expect(row.displayName).toBe("Deleted user");
    expect(row.email).not.toBe(leaver.email);
    expect(row.email).toContain(leaver.id);
    expect(row.image).toBeNull();
    expect(await db.select().from(accounts).where(eq(accounts.userId, leaver.id))).toHaveLength(0);
    expect(await db.select().from(sessions).where(eq(sessions.userId, leaver.id))).toHaveLength(0);
    expect(
      await db.select().from(verifications).where(eq(verifications.identifier, leaver.email)),
    ).toHaveLength(0);

    // History stays: the membership row is still there, marked as left.
    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, leaver.id));
    expect(membership.groupId).toBe(groupId);
    expect(membership.leftAt).not.toBeNull();
  });

  it("refuses while the user owns a live group that still has other members", async () => {
    const owner = await makeUser("Owner");
    const member = await makeUser("Member");
    await makeGroup(owner.id, [member.id]);

    expect(await deleteAccount(owner.id)).toEqual({ ok: false, error: "owns-shared-group" });

    const [row] = await db.select().from(users).where(eq(users.id, owner.id));
    expect(row.displayName).toBe("Owner");
    expect(row.email).toBe(owner.email);
  });

  it("allows it once the shared group is deleted or everyone else has left", async () => {
    const owner = await makeUser("Owner");
    const member = await makeUser("Member");
    const deleted = await makeGroup(owner.id, [member.id]);
    await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, deleted));
    await makeGroup(owner.id, []);

    expect(await deleteAccount(owner.id)).toEqual({ ok: true });
  });

  it("ignores members who already left when checking for a shared group", async () => {
    const owner = await makeUser("Owner");
    const member = await makeUser("Member");
    const groupId = await makeGroup(owner.id, [member.id]);
    await db
      .update(memberships)
      .set({ leftAt: new Date() })
      .where(eq(memberships.userId, member.id));

    expect(await deleteAccount(owner.id)).toEqual({ ok: true });
    expect(groupId).toBeTruthy();
  });
});
