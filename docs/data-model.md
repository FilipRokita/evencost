# EvenCost data model

The seven tables and how they relate. The Drizzle schema is the source of truth
for columns; this file exists for the one thing it does not show at a glance,
which is the shape of the relations. Rendered by GitHub and by the VS Code
Markdown preview.

```mermaid
erDiagram
    users ||--o{ groups : owns
    users ||--o{ memberships : joins
    groups ||--o{ memberships : has
    groups ||--o{ invite_links : issues
    groups ||--o{ expenses : records
    groups ||--o{ settlements : records
    expenses ||--|{ expense_splits : divides
    users ||--o{ expense_splits : shares
    users ||--o{ expenses : pays
    users ||--o{ settlements : transfers

    users {
        uuid id PK
        text email UK "login only, never shown to others"
        text passwordHash "Argon2id"
        text displayName "shown everywhere, not unique"
        text avatarColor "assigned at signup, never derived"
    }

    groups {
        uuid id PK
        text name
        text description
        char currency "immutable after creation"
        uuid ownerId FK "users.id, single owner"
        timestamp deletedAt "soft delete"
        timestamp createdAt
    }

    memberships {
        uuid groupId PK "composite with userId"
        uuid userId PK "composite with groupId"
        timestamp joinedAt
        timestamp leftAt "soft leave, history survives"
    }

    invite_links {
        uuid id PK
        text token UK "crypto random, base64url"
        uuid groupId FK
        timestamp expiresAt "30 days"
        timestamp revokedAt "owner can revoke early"
        timestamp createdAt
    }

    expenses {
        uuid id PK
        uuid groupId FK
        text title
        text category "closed enum"
        integer amountMinor "never a float"
        uuid paidByUserId FK "memberships"
        uuid createdByUserId FK "who may edit or delete"
        date spentOn
        timestamp deletedAt "soft delete"
        timestamp createdAt
    }

    expense_splits {
        uuid expenseId PK "composite with userId"
        uuid userId PK "composite with expenseId"
        integer amountMinor "source of truth for balances"
    }

    settlements {
        uuid id PK
        uuid groupId FK
        uuid fromUserId FK
        uuid toUserId FK
        integer amountMinor
        text note
        timestamp reversedAt "reversal, never a delete"
        timestamp createdAt
    }
```

## The four columns that carry behaviour

Everything else is ordinary. These are the ones a reader would otherwise have to
infer from the code.

| Column | What it means |
| :--- | :--- |
| `users.avatarColor` | Stored, not derived. Computed from a list index it would repaint everyone when the list changes (rule 8b). |
| `expenses.createdByUserId` | Ownership of an expense is the creator, never the payer. The payer has no edit rights (rule 8a). |
| `*.deletedAt` / `*.leftAt` / `*.reversedAt` | Nothing that carries history is ever hard-deleted (decision 4). |
| `groups.currency` | No edit path at all, so there is no migration case for changing it (decision 5). |

## What the diagram does not show

- **Balances are not stored.** They are computed from expenses minus un-reversed
  settlements on every read, which is why there is no `balances` table and why a
  concurrent settle-up needs a row lock on the group (rule 14).
- **`expense_splits` must sum to `expenses.amountMinor`.** PostgreSQL cannot
  enforce that across tables, so it is checked in the domain and again inside the
  transaction (rule 9).
