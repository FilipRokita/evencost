import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { GroupTile } from "@/components/group-tile";
import { NewGroupDialog } from "@/components/new-group-dialog";
import { ProfileDialog } from "@/components/profile-dialog";
import { outstandingTotal } from "@/domain/balances";
import { formatMoney } from "@/domain/money";
import { listGroupsForViewer, listMembers, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

// Everything here waits on the session; a placeholder would only flash.
export const instant = false;

export default async function DashboardPage() {
  const session = await requireSession();
  const groups = await listGroupsForViewer(session.user.id);

  // Two queries per group. Bounded by how many groups one person is in, and the
  // page only exists for that person, so it is not worth a fancier join yet.
  const tiles = await Promise.all(
    groups.map(async (group) => {
      const [members, balances] = await Promise.all([
        listMembers(group.id),
        loadBalances(group.id),
      ]);
      return {
        group,
        members: members.filter((member) => member.leftAt === null),
        balance: balances[session.user.id] ?? 0,
        outstanding: outstandingTotal(balances),
      };
    }),
  );
  // One chip per currency, as the balances cannot be added across currencies.
  const overallByCurrency = new Map<string, number>();
  for (const tile of tiles) {
    overallByCurrency.set(
      tile.group.currency,
      (overallByCurrency.get(tile.group.currency) ?? 0) + tile.balance,
    );
  }
  const overall = [...overallByCurrency.entries()].filter(([, balance]) => balance !== 0);
  const avatarColor = session.user.avatarColor ?? undefined;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-4 md:max-w-5xl md:px-7">
      <header className="flex items-center gap-3 py-4 md:pt-7">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Logo />
          EvenCost
        </Link>
        <div className="ml-auto">
          <ProfileDialog
            name={session.user.name}
            avatarColor={avatarColor}
            trigger={
              <button
                type="button"
                aria-label="Open your profile"
                className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar name={session.user.name} color={avatarColor} />
              </button>
            }
          />
        </div>
      </header>

      <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-tight">
        Hey, {session.user.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Split it. Settle it. Forget it.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {overall.length === 0 ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            You&apos;re all settled
          </span>
        ) : (
          overall.map(([currency, balance]) => (
            <span
              key={currency}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold tabular-nums",
                balance > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
              )}
            >
              {balance > 0
                ? `+${formatMoney(balance, currency)} owed to you`
                : `${formatMoney(Math.abs(balance), currency)} you owe`}
            </span>
          ))
        )}
      </div>

      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Your groups
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        {tiles.length === 0 && (
          <div className="mb-3 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <UsersRound className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-bold">No groups yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Create one, share the invite link, and start splitting.
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {tiles.map(({ group, members, balance, outstanding }) => (
            <GroupTile
              key={group.id}
              id={group.id}
              name={group.name}
              currency={group.currency}
              members={members}
              yourBalance={balance}
              outstanding={outstanding}
            />
          ))}
          <NewGroupDialog />
        </div>
      </div>
    </main>
  );
}
