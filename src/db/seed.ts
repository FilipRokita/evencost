/**
 * Demo data for local development. Optional by design: the app runs fine against
 * an empty database, and this never becomes a step anyone has to run.
 *
 * It resets the demo data, so running it twice gives the same result rather than
 * duplicating groups.
 */
import { db } from "./index";
import { eq } from "drizzle-orm";
import { expenseSplits, expenses, groups, inviteLinks, memberships, settlements, users } from "./schema";
import { auth } from "../lib/auth";

const PASSWORD = "devpassword";

const PEOPLE = [
  { email: "filip@evencost.test", displayName: "Filip", avatarColor: "teal" },
  { email: "ania@evencost.test", displayName: "Ania", avatarColor: "amber" },
  { email: "kuba@evencost.test", displayName: "Kuba", avatarColor: "violet" },
  { email: "marta@evencost.test", displayName: "Marta", avatarColor: "sky" },
  { email: "tomek@evencost.test", displayName: "Tomek", avatarColor: "rose" },
] as const;

async function main() {
  console.log("Resetting demo data…");
  // Deleted in dependency order rather than TRUNCATE ... CASCADE, which floods
  // the output with a NOTICE for every table it cascades into.
  for (const table of [expenseSplits, settlements, expenses, inviteLinks, memberships, groups, users]) {
    await db.delete(table);
  }

  // Created through Better Auth rather than by inserting rows: it owns the
  // password account row, the Argon2id hash and the id generation, so the demo
  // data is shaped exactly the way the app creates real users.
  const inserted: { id: string; email: string }[] = [];
  for (const person of PEOPLE) {
    const result = await auth.api.signUpEmail({
      body: { email: person.email, password: PASSWORD, name: person.displayName },
    });
    await db
      .update(users)
      .set({ avatarColor: person.avatarColor })
      .where(eq(users.id, result.user.id));
    inserted.push({ id: result.user.id, email: person.email });
  }

  const id = (email: string) => {
    const user = inserted.find((u) => u.email === email);
    if (!user) throw new Error(`seed: missing user ${email}`);
    return user.id;
  };

  const filip = id("filip@evencost.test");
  const ania = id("ania@evencost.test");
  const kuba = id("kuba@evencost.test");
  const marta = id("marta@evencost.test");
  const tomek = id("tomek@evencost.test");

  // The trip: all five, PLN, owned by Filip. Filip ends up owing here.
  const [trip] = await db
    .insert(groups)
    .values({
      name: "Weekend in Zakopane",
      description: "Ski trip, 5–8 Mar",
      currency: "PLN",
      ownerId: filip,
    })
    .returning({ id: groups.id });

  await db.insert(memberships).values(
    [filip, ania, kuba, marta, tomek].map((userId) => ({ groupId: trip.id, userId })),
  );

  await db.insert(inviteLinks).values({
    groupId: trip.id,
    token: "x7k2mp9q4wz1r",
    expiresAt: new Date("2026-04-08T00:00:00Z"),
  });

  const tripExpenses = [
    {
      title: "Fuel & tolls",
      category: "fuel" as const,
      amountMinor: 42_000,
      paidByUserId: kuba,
      createdByUserId: kuba,
      spentOn: "2026-03-02",
      // equally, five ways
      splits: { [filip]: 8400, [ania]: 8400, [kuba]: 8400, [marta]: 8400, [tomek]: 8400 },
    },
    {
      title: "Cottage deposit",
      category: "lodging" as const,
      amountMinor: 90_000,
      paidByUserId: ania,
      createdByUserId: filip,
      spentOn: "2026-03-01",
      splits: { [filip]: 18000, [ania]: 18000, [kuba]: 18000, [marta]: 18000, [tomek]: 18000 },
    },
    {
      title: "Groceries",
      category: "groceries" as const,
      amountMinor: 27_550,
      paidByUserId: filip,
      createdByUserId: filip,
      spentOn: "2026-03-02",
      splits: { [filip]: 5510, [ania]: 5510, [kuba]: 5510, [marta]: 5510, [tomek]: 5510 },
    },
    {
      title: "Ski passes",
      category: "activity" as const,
      amountMinor: 75_000,
      paidByUserId: marta,
      createdByUserId: ania,
      spentOn: "2026-03-03",
      // by exact amounts: Marta skipped a day
      splits: { [filip]: 20000, [ania]: 20000, [kuba]: 20000, [marta]: 15000 },
    },
    {
      title: "Pizza night",
      category: "food" as const,
      amountMinor: 14_400,
      paidByUserId: tomek,
      createdByUserId: tomek,
      spentOn: "2026-03-04",
      // by percentage: 50 / 25 / 25
      splits: { [filip]: 7200, [marta]: 3600, [tomek]: 3600 },
    },
  ];

  // The flat: three people, EUR, owned by Ania. Filip is owed here.
  const [flat] = await db
    .insert(groups)
    .values({
      name: "Flat · October",
      description: "Shared costs for our flat",
      currency: "EUR",
      ownerId: ania,
    })
    .returning({ id: groups.id });

  await db.insert(memberships).values(
    [filip, ania, kuba].map((userId) => ({ groupId: flat.id, userId })),
  );

  await db.insert(inviteLinks).values({
    groupId: flat.id,
    token: "a9q4wz1r8t6y",
    expiresAt: new Date("2026-11-01T00:00:00Z"),
  });

  const flatExpenses = [
    {
      title: "Rent",
      category: "lodging" as const,
      amountMinor: 300_000,
      paidByUserId: filip,
      createdByUserId: ania,
      spentOn: "2026-10-01",
      splits: { [filip]: 100000, [ania]: 100000, [kuba]: 100000 },
    },
    {
      title: "Internet",
      category: "other" as const,
      amountMinor: 9_000,
      paidByUserId: filip,
      createdByUserId: filip,
      spentOn: "2026-10-03",
      splits: { [filip]: 3000, [ania]: 3000, [kuba]: 3000 },
    },
    {
      title: "Groceries",
      category: "groceries" as const,
      amountMinor: 16_230,
      paidByUserId: filip,
      createdByUserId: kuba,
      spentOn: "2026-10-05",
      splits: { [filip]: 5000, [ania]: 7000, [kuba]: 4230 },
    },
  ];

  for (const [group, list] of [
    [trip, tripExpenses],
    [flat, flatExpenses],
  ] as const) {
    for (const e of list) {
      const total = Object.values(e.splits).reduce((a, b) => a + b, 0);
      if (total !== e.amountMinor) {
        throw new Error(`seed: ${e.title} splits sum to ${total}, expected ${e.amountMinor}`);
      }

      const [row] = await db
        .insert(expenses)
        .values({
          groupId: group.id,
          title: e.title,
          category: e.category,
          amountMinor: e.amountMinor,
          paidByUserId: e.paidByUserId,
          createdByUserId: e.createdByUserId,
          spentOn: e.spentOn,
        })
        .returning({ id: expenses.id });

      await db.insert(expenseSplits).values(
        Object.entries(e.splits).map(([userId, amountMinor]) => ({
          expenseId: row.id,
          userId,
          amountMinor,
        })),
      );
    }
  }

  // A partial settlement: Ania pays Filip part of her rent share.
  await db.insert(settlements).values({
    groupId: flat.id,
    fromUserId: ania,
    toUserId: filip,
    amountMinor: 50_000,
    note: "rent share, partial",
  });

  console.log(`Seeded ${PEOPLE.length} accounts, 2 groups, ${tripExpenses.length + flatExpenses.length} expenses.`);
  console.log(`Sign in with any of the @evencost.test addresses, password: ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
