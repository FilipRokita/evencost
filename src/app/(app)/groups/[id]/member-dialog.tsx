"use client";

import type { ReactNode } from "react";
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

/**
 * The sheet behind a balance tile. Tapping your own tile is the only route to
 * leaving a group; the owner's own tile offers deleting it instead, because an
 * owner cannot leave (decisions 3 and 1a).
 */
export function MemberDialog({
  name,
  avatarColor,
  balance,
  currency,
  isSelf,
  removeAction,
  leaveAction,
  deleteAction,
  trigger,
}: {
  name: string;
  avatarColor: string;
  balance: number;
  currency: string;
  isSelf: boolean;
  removeAction?: () => Promise<void>;
  leaveAction?: () => Promise<void>;
  deleteAction?: () => Promise<void>;
  trigger: ReactNode;
}) {
  const settled = balance === 0;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {name}
            {isSelf ? " (you)" : ""}
          </DialogTitle>
          <DialogDescription>
            {settled
              ? "Settled up."
              : balance < 0
                ? `Owes ${formatMoney(Math.abs(balance), currency)}.`
                : `Is owed ${formatMoney(balance, currency)}.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
            <Avatar name={name} color={avatarColor} />
            <span className="min-w-0 truncate text-sm font-semibold">{name}</span>
          </div>

        {leaveAction && (
          <>
            <form action={leaveAction}>
              <Button type="submit" variant="destructive" className="w-full">
                Leave group
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              {settled
                ? "Your past expenses stay in the group's history."
                : "You still have an outstanding balance. Leaving keeps it recorded."}
            </p>
          </>
        )}

        {deleteAction && (
          <>
            <form action={deleteAction}>
              <Button type="submit" variant="destructive" className="w-full">
                Delete group
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              As the owner you cannot leave. Deleting hides the group for everyone; the history
              stays in the database.
            </p>
          </>
        )}

        {removeAction && (
          <>
            <form action={removeAction}>
              <Button type="submit" variant="destructive" className="w-full" disabled={!settled}>
                Remove from group
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              {settled
                ? "Their past expenses stay in the group's history."
                : "They have an outstanding balance. Settle up before removing them."}
            </p>
          </>
        )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
