import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "./avatar";
import { formatMoney } from "@/domain/money";
import { cn } from "@/lib/utils";

export type GroupTileProps = {
  id: string;
  name: string;
  currency: string;
  members: { id: string; displayName: string; avatarColor: string }[];
  /** Positive: the group owes the viewer. Negative: the viewer owes the group. */
  yourBalance: number;
  /** What the whole group still has to move. */
  outstanding: number;
};

/** At most three circles: two faces plus a count when the group is bigger. */
export function MemberStack({ members }: { members: GroupTileProps["members"] }) {
  const shown = members.length > 3 ? members.slice(0, 2) : members;
  const hidden = members.length - shown.length;

  return (
    <span className="flex shrink-0 -space-x-2.5">
      {shown.map((member) => (
        <Avatar
          key={member.id}
          name={member.displayName}
          color={member.avatarColor}
          className="size-8 ring-2 ring-background"
        />
      ))}
      {hidden > 0 && (
        <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground ring-2 ring-background">
          +{hidden}
        </span>
      )}
    </span>
  );
}

export function GroupTile({ id, name, currency, members, yourBalance, outstanding }: GroupTileProps) {
  const people = `${members.length} ${members.length === 1 ? "person" : "people"}`;
  // When the viewer is the only side of the balance, the group total is the same
  // number as their own. Printing it twice reads like a bug.
  const meta =
    outstanding === 0
      ? `${people} · all settled`
      : outstanding === Math.abs(yourBalance)
        ? people
        : `${people} · ${formatMoney(outstanding, currency)} unsettled`;

  return (
    <Link
      href={`/groups/${id}`}
      className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <MemberStack members={members} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{name}</span>
        <span
          className={cn(
            "mt-1 block text-sm font-bold tabular-nums",
            yourBalance > 0 && "text-primary",
            yourBalance < 0 && "text-destructive",
            yourBalance === 0 && "font-semibold text-muted-foreground",
          )}
        >
          {yourBalance > 0 && `+${formatMoney(yourBalance, currency)} owed to you`}
          {yourBalance < 0 && `${formatMoney(Math.abs(yourBalance), currency)} you owe`}
          {yourBalance === 0 && "You're settled up"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
