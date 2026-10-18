import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronRight, Plus } from "lucide-react";
import { AnimateNewExpenses } from "@/components/animate-new-expenses";
import { CategoryIcon } from "@/components/category-icon";
import { canEditExpense, canReverseSettlement } from "@/domain/permissions";
import { netting } from "@/domain/netting";
import { ExpenseDialog } from "./expense-dialog";
import { FloatingExpense } from "./floating-expense";
import { MemberDialog } from "./member-dialog";
import { SettleDialog } from "./settle-dialog";
import { reverseSettlementAction } from "./settlement-actions";
import { Avatar } from "@/components/avatar";
import { MemberStack } from "@/components/group-tile";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { getActiveInvite, getGroupForViewer, listExpenses, listMembers, listSettlements, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";
import { deleteGroupAction, leaveGroupAction, regenerateInviteAction, removeMemberAction } from "../actions";
import { GroupTopbar } from "./group-topbar";
import { InviteDialog } from "./invite-dialog";

// The group lookup and membership check must finish before anything renders.
export const instant = false;

export default async function GroupPage({ params, searchParams }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const { before } = await searchParams;
  const session = await requireSession();
  // A malformed id is not a database error; it is simply not a group.
  if (!z.uuid().safeParse(id).success) notFound();

  const group = await getGroupForViewer(id, session.user.id);
  // A group that is not yours and a group that does not exist are the same
  // answer, so the response cannot be used to discover groups (rule 10).
  if (!group) notFound();
  const groupId = group.id;

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
  const departedMembers = members.filter((member) => member.leftAt !== null);
  const membersById = new Map(members.map((member) => [member.id, member]));
  // A departed member keeps a tile while they still carry a balance, so the
  // debt stays visible until it is settled (rule 1).
  const balanceMembers = members.filter(
    (member) => member.leftAt === null || (balances[member.id] ?? 0) !== 0,
  );
  const groupView = {
    ownerId: group.ownerId,
    members: members.map((member) => ({ userId: member.id, leftAt: member.leftAt })),
  };
  const isOwner = group.ownerId === session.user.id;
  // One timeline, newest first, like the prototype.
  const activity = [
    ...expenses.items.map((expense) => ({
      kind: "expense" as const,
      date: expense.spentOn,
      expense,
    })),
    ...settlements.map((settlement) => ({
      kind: "settlement" as const,
      date: settlement.createdAt.toISOString().slice(0, 10),
      settlement,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const inviteUrl = invite
    ? new URL(`/invite/${invite.token}`, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString()
    : null;
  async function regenerateInvite() {
    "use server";
    await regenerateInviteAction(groupId);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-16 md:flex md:h-dvh md:max-w-5xl md:flex-col md:overflow-hidden md:px-7 md:pb-0">
      <GroupTopbar name={group.name} sentinelId="group-actions" />

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{group.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {group.description ? `${group.description} · ${group.currency}` : group.currency}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <MemberStack members={active} />
        <span className="ml-1 text-sm text-muted-foreground">
          {active.length} {active.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div id="group-actions" className="mt-4 grid grid-cols-2 gap-2 md:flex md:w-fit">
        <ExpenseDialog
          groupId={group.id}
          currency={group.currency}
          members={active}
          viewerId={session.user.id}
          trigger={
            <Button size="lg" className="w-full md:w-auto">
              <Plus className="size-4" aria-hidden="true" />
              Add expense
            </Button>
          }
        />
        <SettleDialog
          groupId={group.id}
          currency={group.currency}
          members={balanceMembers}
          transfers={transfers}
          trigger={
            <Button size="lg" className="w-full md:w-auto" variant={transfers.length > 0 ? "default" : "secondary"}>
              {transfers.length > 0
                ? `Settle up: ${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`
                : "All settled"}
            </Button>
          }
        />
      </div>

      <FloatingExpense
        sentinelId="group-actions"
        groupId={group.id}
        currency={group.currency}
        members={active}
        viewerId={session.user.id}
      />

      <div className="mt-6 md:grid md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_340px] md:items-stretch md:gap-7">
        {/* On a phone: balances first. On desktop: the right column. */}
        <section className="min-w-0 md:order-2 md:overflow-y-auto md:pr-2 md:pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Balances
          </p>

          <div className="grid grid-cols-2 gap-3">
            {balanceMembers.map((member) => {
              const amount = balances[member.id] ?? 0;
              const isSelf = member.id === session.user.id;
              const activeMember = member.leftAt === null;
              const canRemove = isOwner && !isSelf && activeMember;
              const tappable = isSelf || canRemove;
              const tileClass = `w-full rounded-xl border border-border bg-card p-3 text-center ${
                member.leftAt ? "opacity-75" : ""
              } ${
                tappable
                  ? "transition-colors hover:border-white/25 hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  : ""
              }`;
              const contents = (
                <>
                  <Avatar name={member.displayName} color={member.avatarColor} className="mx-auto" />
                  <span className="mt-2 block truncate text-xs font-semibold">
                    {member.displayName}
                    {isSelf ? " (you)" : ""}
                    {member.leftAt ? " · left" : ""}
                  </span>
                  <span
                    className={`mt-1 block text-sm font-bold tabular-nums ${
                      amount > 0 ? "text-primary" : amount < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {amount > 0 ? "owed to" : amount < 0 ? "owes" : "settled"}
                    </span>
                    {amount === 0 ? formatMoney(0, group.currency) : formatMoney(Math.abs(amount), group.currency)}
                  </span>
                </>
              );

              if (!tappable) {
                return (
                  <div key={member.id} className={tileClass}>
                    {contents}
                  </div>
                );
              }

              return (
                <MemberDialog
                  key={member.id}
                  name={member.displayName}
                  avatarColor={member.avatarColor}
                  balance={amount}
                  currency={group.currency}
                  isSelf={isSelf}
                  leaveAction={isSelf && !isOwner ? leaveGroupAction.bind(null, group.id) : undefined}
                  deleteAction={isSelf && isOwner ? deleteGroupAction.bind(null, group.id) : undefined}
                  removeAction={
                    canRemove ? removeMemberAction.bind(null, group.id, member.id) : undefined
                  }
                  trigger={
                    <button type="button" className={tileClass}>
                      {contents}
                    </button>
                  }
                />
              );
            })}

            <InviteDialog
              url={inviteUrl}
              regenerate={isOwner ? regenerateInvite : undefined}
              trigger={
                <button
                  type="button"
                  className="flex min-h-[112px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus className="size-5" aria-hidden="true" />
                  Invite
                </button>
              }
            />
          </div>
        </section>

        {/* On a phone: activity second. On desktop: the left column. */}
        <section id="expenses-section" className="min-w-0 md:order-1 md:overflow-y-auto md:pr-2 md:pb-8">
          <AnimateNewExpenses targetId="expenses-section" />
          <div className="mt-8 mb-3 md:mt-0">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Activity
            </span>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No activity yet. Add the first expense.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => {
                if (item.kind === "settlement") {
                  const settlement = item.settlement;
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
                          {membersById.get(settlement.fromUserId)?.displayName ?? "Someone"} paid{" "}
                          {membersById.get(settlement.toUserId)?.displayName ?? "someone"}
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
                }

                const expense = item.expense;
                const payer = membersById.get(expense.paidByUserId);
                const mine = expense.splits[session.user.id] ?? 0;
                // Editing keeps the people who were on the expense, even if one
                // of them has since left (rule 1).
                const departed = departedMembers.filter(
                  (member) =>
                    member.id === expense.paidByUserId || expense.splits[member.id] !== undefined,
                );
                const dialogMembers = [...active, ...departed];
                return (
                  <ExpenseDialog
                    key={expense.id}
                    groupId={group.id}
                    currency={group.currency}
                    members={dialogMembers}
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
                        data-expense-row=""
                        className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all duration-300 hover:border-white/25 hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none ${
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
                            <span className="mt-1 inline-block animate-in rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground duration-200 fade-in zoom-in-95">
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
                  className="block rounded-xl border border-border bg-card py-2.5 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Show earlier expenses
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
