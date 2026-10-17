import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AVATAR_CLASS, initials, type AvatarColor } from "@/lib/avatar";
import { requireSession } from "@/lib/session";
import { signOutAction } from "../actions";

export default async function DashboardPage() {
  const session = await requireSession();
  const { user } = session;
  const color = (user.avatarColor ?? "teal") as AvatarColor;

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

      <h1 className="mt-2 text-[1.7rem] font-extrabold tracking-tight">
        Hey, {user.name} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Split it. Settle it. Forget it.</p>

      <div className="mt-6 flex items-center gap-3">
        <span
          className={`grid size-10 place-items-center rounded-full text-sm font-bold text-white ${AVATAR_CLASS[color] ?? AVATAR_CLASS.teal}`}
          aria-hidden="true"
        >
          {initials(user.name)}
        </span>
        <div className="text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{user.email}</span>
        </div>
      </div>

      <p className="mt-10 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Your groups
      </p>

      <div className="mt-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <div className="text-3xl" aria-hidden="true">
          💸
        </div>
        <h2 className="mt-3 text-base font-bold">No groups yet</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
          Creating groups and inviting people lands in the next stage.
        </p>
      </div>
    </main>
  );
}
