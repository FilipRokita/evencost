"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/domain/money";
import type { Transfer } from "@/domain/netting";
import type { FormState } from "@/lib/form-state";
import { recordTransferAction, recordTransfersAction } from "./settlement-actions";

type Member = { id: string; displayName: string; avatarColor: string };

export function SettleDialog({
  groupId,
  currency,
  members,
  transfers,
  trigger,
}: {
  groupId: string;
  currency: string;
  members: Member[];
  transfers: Transfer[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(transfers.map((_, index) => index));
  const [result, setResult] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const [customState, customAction, customPending] = useActionState<FormState, FormData>(
    recordTransferAction,
    {},
  );

  const name = (id: string) => members.find((member) => member.id === id)?.displayName ?? "Someone";
  const color = (id: string) => members.find((member) => member.id === id)?.avatarColor ?? "teal";

  async function record() {
    setPending(true);
    setResult({});
    const chosen = selected.map((index) => transfers[index]);
    const outcome = await recordTransfersAction(groupId, chosen);
    setResult(outcome);
    setPending(false);
    if (outcome.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            {transfers.length === 0
              ? "Everyone is even. Nothing to settle."
              : `${transfers.length} transfer${transfers.length === 1 ? "" : "s"} clears the whole group.`}
          </DialogDescription>
        </DialogHeader>

        {transfers.length > 0 && (
          <div className="space-y-2">
            {transfers.map((transfer, index) => (
              <label
                key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-secondary p-2.5"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(index)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, index]
                        : current.filter((value) => value !== index),
                    )
                  }
                  className="size-4 accent-[var(--primary)]"
                />
                <Avatar name={name(transfer.fromUserId)} color={color(transfer.fromUserId)} className="size-6 text-[0.6rem]" />
                <span className="min-w-0 truncate text-sm font-semibold">{name(transfer.fromUserId)}</span>
                <span className="text-muted-foreground">→</span>
                <Avatar name={name(transfer.toUserId)} color={color(transfer.toUserId)} className="size-6 text-[0.6rem]" />
                <span className="min-w-0 truncate text-sm font-semibold">{name(transfer.toUserId)}</span>
                <span className="ml-auto shrink-0 text-sm font-bold tabular-nums">
                  {formatMoney(transfer.amountMinor, currency)}
                </span>
              </label>
            ))}

            {result.error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {result.error}
              </p>
            )}

            <Button className="w-full" onClick={record} disabled={pending || selected.length === 0}>
              {pending ? "Recording…" : `Record ${selected.length} transfer${selected.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}

        <div className="mt-2 border-t border-border pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Or record part of it
          </p>

          <form action={customAction} className="space-y-3">
            <input type="hidden" name="groupId" value={groupId} />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="fromUserId">From</Label>
                <select
                  id="fromUserId"
                  name="fromUserId"
                  defaultValue={members[0]?.id}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toUserId">To</Label>
                <select
                  id="toUserId"
                  name="toUserId"
                  defaultValue={members[1]?.id ?? members[0]?.id}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="tabular-nums" />
              {customState.fieldErrors?.amount && (
                <p className="text-sm text-destructive">{customState.fieldErrors.amount[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="note" name="note" placeholder="rent share, partial" />
            </div>

            {customState.error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {customState.error}
              </p>
            )}
            {customState.success && (
              <p className="text-sm font-semibold text-primary">{customState.success}</p>
            )}

            <Button type="submit" variant="secondary" className="w-full" disabled={customPending}>
              {customPending ? "Recording…" : "Record transfer"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
