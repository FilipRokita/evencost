"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/domain/money";
import type { Transfer } from "@/domain/netting";
import type { FormState } from "@/lib/form-state";
import { recordTransferAction, recordTransfersAction } from "./settlement-actions";

type Member = { id: string; displayName: string; avatarColor: string };

/** Selection follows the transfer itself, not its position in a list that can change. */
const transferKey = (transfer: Transfer) =>
  `${transfer.fromUserId}|${transfer.toUserId}|${transfer.amountMinor}`;

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
  const [tab, setTab] = useState<"suggested" | "custom">("suggested");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(transfers.map(transferKey)),
  );
  const [result, setResult] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const byId = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const name = (id: string) => byId.get(id)?.displayName ?? "Someone";
  const color = (id: string) => byId.get(id)?.avatarColor;
  const chosen = transfers.filter((transfer) => selected.has(transferKey(transfer)));

  // A fresh open starts from the current suggestions; a route refresh while the
  // sheet is open leaves the selection alone, and stale keys simply drop out.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelected(new Set(transfers.map(transferKey)));
      setResult({});
      setTab(transfers.length > 0 ? "suggested" : "custom");
    }
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function record() {
    if (chosen.length === 0) {
      setResult({ error: "Pick at least one transfer." });
      return;
    }

    setPending(true);
    setResult({});
    try {
      const outcome = await recordTransfersAction(groupId, chosen);
      setResult(outcome);
      if (outcome.success) setOpen(false);
    } catch {
      setResult({ error: "Could not record the transfers. Try again." });
    } finally {
      setPending(false);
    }
  }

  const tabOffset =
    tab === "suggested" ? "translate-x-0" : "translate-x-[calc(100%_+_0.25rem)]";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            {tab === "suggested"
              ? transfers.length === 0
                ? "Everyone is even. Nothing to settle."
                : `${transfers.length} transfer${transfers.length === 1 ? "" : "s"} clears the whole group.`
              : "Record a partial or custom payment."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="relative flex rounded-xl bg-secondary p-1">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-1 left-1 w-[calc((100%_-_0.75rem)/2)] rounded-lg bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none ${tabOffset}`}
            />
            <button
              type="button"
              aria-pressed={tab === "suggested"}
              onClick={() => setTab("suggested")}
              className={`relative z-10 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                tab === "suggested"
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Suggested {transfers.length > 0 ? `(${transfers.length})` : ""}
            </button>
            <button
              type="button"
              aria-pressed={tab === "custom"}
              onClick={() => setTab("custom")}
              className={`relative z-10 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                tab === "custom"
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom transfer
            </button>
          </div>

          {tab === "suggested" ? (
            transfers.length > 0 ? (
              <div className="space-y-2">
                {transfers.map((transfer, index) => {
                  const key = transferKey(transfer);
                  return (
                    <label
                      key={`${key}-${index}`}
                      className="flex cursor-pointer items-center gap-2 rounded-xl bg-secondary p-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <Avatar
                        name={name(transfer.fromUserId)}
                        color={color(transfer.fromUserId)}
                        className="size-6 text-[0.6rem]"
                      />
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {name(transfer.fromUserId)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <Avatar
                        name={name(transfer.toUserId)}
                        color={color(transfer.toUserId)}
                        className="size-6 text-[0.6rem]"
                      />
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {name(transfer.toUserId)}
                      </span>
                      <span className="ml-auto shrink-0 text-sm font-bold tabular-nums">
                        {formatMoney(transfer.amountMinor, currency)}
                      </span>
                    </label>
                  );
                })}

                {result.error && (
                  <p role="alert" className="text-sm font-semibold text-destructive">
                    {result.error}
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={record}
                  disabled={pending || chosen.length === 0}
                >
                  {pending
                    ? "Recording…"
                    : `Record ${chosen.length} transfer${chosen.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-secondary/50 p-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Everyone is even. Nothing to settle.
                </p>
              </div>
            )
          ) : (
            open && (
              <CustomTransferForm
                groupId={groupId}
                members={members}
                onDone={() => setOpen(false)}
              />
            )
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function CustomTransferForm({
  groupId,
  members,
  onDone,
}: {
  groupId: string;
  members: Member[];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    recordTransferAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      onDone?.();
    }
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="fromUserId">From</Label>
          <select
            id="fromUserId"
            name="fromUserId"
            defaultValue={members[0]?.id}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          className="tabular-nums"
        />
        {state.fieldErrors?.amount && (
          <p className="text-sm text-destructive">{state.fieldErrors.amount[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="note" name="note" placeholder="rent share, partial" />
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm font-semibold text-primary">
          {state.success}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Recording…" : "Record transfer"}
      </Button>
    </form>
  );
}
