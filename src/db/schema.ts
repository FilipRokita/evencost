import {
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A closed enum, not free text: an unknown key would render as an empty icon.
 * The UI maps each key to a lucide icon.
 */
export const expenseCategory = pgEnum("expense_category", [
  "food",
  "fuel",
  "lodging",
  "groceries",
  "activity",
  "transport",
  "tickets",
  "taxi",
  "drinks",
  "other",
  "health",
  "gift",
]);

const createdAt = timestamp("created_at", { withTimezone: true, precision: 6 })
  .notNull()
  .defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Login only. Never shown to anyone else.
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Shown everywhere. Deliberately not unique: invites arrive by link, so nobody
  // is ever looked up by name (rule 17).
  displayName: text("display_name").notNull(),
  // Assigned once at signup and never derived from list position (rule 8b).
  avatarColor: text("avatar_color").notNull(),
  createdAt,
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // Immutable after creation. No edit path, so no migration case (decision 5).
  currency: text("currency").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  // Soft delete: members lose access, history survives (decision 4).
  deletedAt: timestamp("deleted_at", { withTimezone: true, precision: 6 }),
  createdAt,
});

/**
 * Composite primary key. A membership is never deleted, only marked with
 * `leftAt`, so a departed member still appears in past expenses and balances
 * (rule 1).
 */
export const memberships = pgTable(
  "memberships",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true, precision: 6 }),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const inviteLinks = pgTable(
  "invite_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // crypto.randomBytes(16) as base64url; never sequential.
    token: text("token").notNull().unique(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    // Both checks live in the same lookup: an expired link and a revoked link
    // are the same failure to the person opening it (rule 13).
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      precision: 6,
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, precision: 6 }),
    createdAt,
  },
  (t) => [index("invite_links_group_idx").on(t.groupId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: expenseCategory("category").notNull(),
    // Integer minor units. Never a float.
    amountMinor: integer("amount_minor").notNull(),
    paidByUserId: uuid("paid_by_user_id").notNull(),
    // Ownership of an expense is the creator, never the payer (rule 8a).
    createdByUserId: uuid("created_by_user_id").notNull(),
    spentOn: date("spent_on").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, precision: 6 }),
    createdAt,
  },
  (t) => [
    // The payer has to be a member of this group (rule 8).
    foreignKey({
      name: "expenses_payer_member_fk",
      columns: [t.groupId, t.paidByUserId],
      foreignColumns: [memberships.groupId, memberships.userId],
    }),
    foreignKey({
      name: "expenses_creator_member_fk",
      columns: [t.groupId, t.createdByUserId],
      foreignColumns: [memberships.groupId, memberships.userId],
    }),
    index("expenses_group_date_idx").on(t.groupId, t.spentOn),
  ],
);

/**
 * The stored split amounts are the source of truth for balances, not a value
 * recomputed from the split mode. PostgreSQL cannot check across tables that
 * they sum to `expenses.amountMinor`, so the domain enforces that and the
 * transaction re-checks it before commit (rule 9).
 */
export const expenseSplits = pgTable(
  "expense_splits",
  {
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    amountMinor: integer("amount_minor").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.userId] }),
    index("expense_splits_user_idx").on(t.userId),
  ],
);

/**
 * A settlement is a recorded transfer, never a flag on an expense. Reversing one
 * sets `reversedAt`; the row is never deleted (rule 2).
 */
export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id").notNull(),
    toUserId: uuid("to_user_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    note: text("note").notNull().default(""),
    reversedAt: timestamp("reversed_at", { withTimezone: true, precision: 6 }),
    createdAt,
  },
  (t) => [
    foreignKey({
      name: "settlements_from_member_fk",
      columns: [t.groupId, t.fromUserId],
      foreignColumns: [memberships.groupId, memberships.userId],
    }),
    foreignKey({
      name: "settlements_to_member_fk",
      columns: [t.groupId, t.toUserId],
      foreignColumns: [memberships.groupId, memberships.userId],
    }),
    index("settlements_group_idx").on(t.groupId),
  ],
);
