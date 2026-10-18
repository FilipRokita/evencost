"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/domain/money";

type MemberInfo = {
  displayName: string;
  avatarColor: string;
};

type SettlementData = {
  id: string;
  amountMinor: number;
  note: string;
  reversedAt: Date | null;
};

export function SettlementDialog({
  settlement,
  currency,
  fromMember,
  toMember,
  canReverse,
  reverseAction,
  trigger,
}: {
  settlement: SettlementData;
  currency: string;
  fromMember: MemberInfo;
  toMember: MemberInfo;
  canReverse: boolean;
  reverseAction?: () => Promise<void>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleReverse() {
    if (!reverseAction) return;
    setPending(true);
    try {
      await reverseAction();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            {settlement.reversedAt
              ? "This transfer was reversed."
              : "Recorded transfer between members."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                name={fromMember.displayName}
                color={fromMember.avatarColor}
                className="size-8 text-xs"
              />
              <span className="truncate text-sm font-semibold">{fromMember.displayName}</span>
            </div>

            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>

            <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
              <span className="truncate text-sm font-semibold">{toMember.displayName}</span>
              <Avatar
                name={toMember.displayName}
                color={toMember.avatarColor}
                className="size-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border p-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-base font-bold tabular-nums">
                {formatMoney(settlement.amountMinor, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  settlement.reversedAt
                    ? "bg-secondary text-muted-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {settlement.reversedAt ? "reversed" : "settled"}
              </span>
            </div>

            {settlement.note && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Note</span>
                <span className="font-medium">{settlement.note}</span>
              </div>
            )}
          </div>

          {canReverse && !settlement.reversedAt && reverseAction && (
            <div className="pt-2">
              <form action={handleReverse}>
                <Button type="submit" variant="destructive" className="w-full" disabled={pending}>
                  {pending ? "Reversing…" : "Reverse transfer"}
                </Button>
              </form>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                Reversing restores the amount to group balances as unsettled.
              </p>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

