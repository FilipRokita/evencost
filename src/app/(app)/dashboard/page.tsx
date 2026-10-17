import Link from "next/link";
import { Logo } from "@/components/logo";
import { GroupTile } from "@/components/group-tile";
import { NewGroupDialog } from "@/components/new-group-dialog";
import { Button } from "@/components/ui/button";
import { outstandingTotal } from "@/domain/balances";
import { listGroupsForViewer, listMembers, loadBalances } from "@/lib/groups";
import { requireSession } from "@/lib/session";
import { signOutAction } from "../actions";

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

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-16">
      <header className="flex items-center gap-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <Logo />
          EvenCost
        </Link>
        <form action={signOutAction} className="ml-auto">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-tight">Hey, {session.user.name} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">Split it. Settle it. Forget it.</p>

      <p className="mt-8 mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Your groups
      </p>

      {tiles.length === 0 && (
        <div className="mb-3 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="text-3xl" aria-hidden="true">
            💸
          </span>
          <h2 className="mt-3 text-base font-bold">No groups yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Create one, share the invite link, and start splitting.
          </p>
        </div>
      )}

      <div className="grid gap-3">
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
    </main>
  );
}
