import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { canEditExpense, canReverseSettlement } from "@/domain/permissions";
import { netting } from "@/domain/netting";
import { ExpenseDialog } from "./expense-dialog";
import { SettleDialog } from "./settle-dialog";
import { reverseSettlementAction } from "./settlement-actions";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { getActiveInvite, getGroupForViewer, listExpenses, listMembers, listSettlements, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";
import { leaveGroupAction, regenerateInviteAction } from "../actions";
import { InvitePanel } from "./invite-panel";

export default async function GroupPage({ params, searchParams }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const { before } = await searchParams;
  const session = await requireSession();

  const group = await getGroupForViewer(id, session.user.id);
  // A group that is not yours and a group that does not exist are the same
  // answer, so the response cannot be used to discover groups (rule 10).
  if (!group) notFound();

  const cursor = typeof before === "string" ? new Date(before) : undefined;
  const [members, balances, invite, expenses, settlements] = await Promise.all([
    listMembers(group.id),
    loadBalances(group.id),
    getActiveInvite(group.id),
    listExpenses(group.id, { before: cursor && !Number.isNaN(cursor.getTime()) ? cursor : undefined }),
    listSettlements(group.id),
  ]);
  // Suggest only when something is actually outstanding.
  const transfers = Object.values(balances).some((value) => value !== 0) ? netting(balances) : [];
  const active = members.filter((member) => member.leftAt === null);
  const groupView = {
    ownerId: group.ownerId,
    members: members.map((member) => ({ userId: member.id, leftAt: member.leftAt })),
  };
  const isOwner = group.ownerId === session.user.id;
  const inviteUrl = invite
    ? new URL(`/invite/${invite.token}`, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString()
    : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-16">
      <header className="flex items-center gap-3 py-4">
        <Link
          href="/dashboard"
          aria-label="Back to your groups"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <span className="ml-auto text-sm font-semibold text-muted-foreground">
          {group.currency}
        </span>
      </header>

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{group.name}</h1>
      {group.description && (
        <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {active.slice(0, 5).map((member) => (
          <Avatar key={member.id} name={member.displayName} color={member.avatarColor} className="size-8" />
        ))}
        {active.length > 5 && (
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
            +{active.length - 5}
          </span>
        )}
        <span className="ml-1 text-sm text-muted-foreground">
          {active.length} {active.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="mt-5">
        <InvitePanel
          url={inviteUrl}
          regenerate={async () => {
            "use server";
            await regenerateInviteAction(group.id);
          }}
        />
      </div>

      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Balances
      </p>

      <div className="grid grid-cols-2 gap-3">
        {active.map((member) => {
          const amount = balances[member.id] ?? 0;
          return (
            <div
              key={member.id}
              className={`rounded-xl border bg-card p-3 text-center ${
                member.id === session.user.id ? "border-primary" : "border-border"
              }`}
            >
              <Avatar name={member.displayName} color={member.avatarColor} className="mx-auto" />
              <p className="mt-2 truncate text-xs font-semibold">
                {member.displayName}
                {member.id === session.user.id ? " (you)" : ""}
              </p>
              <p
                className={`mt-1 text-sm font-bold tabular-nums ${
                  amount > 0 ? "text-primary" : amount < 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {amount > 0 ? "owed to" : amount < 0 ? "owes" : "settled"}
                </span>
                {amount === 0 ? formatMoney(0, group.currency) : formatMoney(Math.abs(amount), group.currency)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <SettleDialog
          groupId={group.id}
          currency={group.currency}
          members={active}
          transfers={transfers}
          trigger={
            <Button className="w-full" size="lg" variant={transfers.length > 0 ? "default" : "secondary"}>
              {transfers.length > 0
                ? `Settle up: ${transfers.length} transfer${transfers.length === 1 ? "" : "s"} suggested`
                : "All settled"}
            </Button>
          }
        />
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Expenses
        </span>
        <ExpenseDialog
          groupId={group.id}
          currency={group.currency}
          members={active}
          viewerId={session.user.id}
          trigger={<Button size="sm">Add expense</Button>}
        />
      </div>

      {expenses.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No expenses yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.items.map((expense) => {
            const payer = members.find((member) => member.id === expense.paidByUserId);
            const mine = expense.splits[session.user.id] ?? 0;
            return (
              <ExpenseDialog
                key={expense.id}
                groupId={group.id}
                currency={group.currency}
                members={active}
                viewerId={session.user.id}
                canEdit={canEditExpense(session.user.id, groupView, expense)}
                expense={{
                  id: expense.id,
                  title: expense.title,
                  category: expense.category,
                  amountMinor: expense.amountMinor,
                  paidByUserId: expense.paidByUserId,
                  spentOn: expense.spentOn,
                  splits: expense.splits,
                }}
                trigger={
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      expense.deletedAt ? "opacity-55" : ""
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                      <CategoryIcon category={expense.category} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-semibold ${expense.deletedAt ? "line-through" : ""}`}>
                        {expense.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {payer?.displayName ?? "Someone"} paid · {expense.spentOn}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums">
                        {formatMoney(expense.amountMinor, group.currency)}
                      </span>
                      {expense.deletedAt ? (
                        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                          deleted
                        </span>
                      ) : mine > 0 && expense.paidByUserId !== session.user.id ? (
                        <span className="mt-1 inline-block rounded-full bg-destructive/15 px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-destructive">
                          you owe {formatMoney(mine, group.currency)}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                }
              />
            );
          })}

          {expenses.nextCursor && (
            <Link
              href={`/groups/${group.id}?before=${encodeURIComponent(expenses.nextCursor.toISOString())}`}
              className="block rounded-xl border border-border bg-card py-2.5 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Show earlier expenses
            </Link>
          )}
        </div>
      )}

      {settlements.length > 0 && (
        <>
          <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Settlements
          </p>
          <div className="space-y-2">
            {settlements.map((settlement) => {
              const canReverse =
                !settlement.reversedAt &&
                canReverseSettlement(session.user.id, groupView, settlement);
              return (
                <div
                  key={settlement.id}
                  className={`flex items-center gap-3 rounded-xl border border-primary/20 bg-card p-3 ${
                    settlement.reversedAt ? "opacity-55" : ""
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    →
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${settlement.reversedAt ? "line-through" : ""}`}>
                      {members.find((m) => m.id === settlement.fromUserId)?.displayName ?? "Someone"} paid{" "}
                      {members.find((m) => m.id === settlement.toUserId)?.displayName ?? "someone"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {settlement.note}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums">
                      {formatMoney(settlement.amountMinor, group.currency)}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                      {settlement.reversedAt ? "reversed" : "settled"}
                    </span>
                  </span>
                  {canReverse && (
                    <form action={reverseSettlementAction.bind(null, settlement.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Undo
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isOwner && (
        <form action={leaveGroupAction.bind(null, group.id)} className="mt-8">
          <Button type="submit" variant="destructive" className="w-full">
            Leave group
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Leaving keeps your past expenses in the group&apos;s history.
          </p>
        </form>
      )}
    </main>
  );
}
