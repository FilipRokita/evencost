import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { getActiveInvite, getGroupForViewer, listMembers, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";
import { leaveGroupAction, regenerateInviteAction } from "../actions";
import { InvitePanel } from "./invite-panel";

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const session = await requireSession();

  const group = await getGroupForViewer(id, session.user.id);
  // A group that is not yours and a group that does not exist are the same
  // answer, so the response cannot be used to discover groups (rule 10).
  if (!group) notFound();

  const [members, balances, invite] = await Promise.all([
    listMembers(group.id),
    loadBalances(group.id),
    getActiveInvite(group.id),
  ]);
  const active = members.filter((member) => member.leftAt === null);
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

      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Expenses
      </p>
      <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Adding expenses lands in the next stage.
        </p>
      </div>

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
