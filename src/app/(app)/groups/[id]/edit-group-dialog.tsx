"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { updateGroupAction } from "@/app/(app)/groups/actions";
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
import { CURRENCIES } from "@/domain/currencies";
import type { FormState } from "@/lib/form-state";

export function EditGroupDialog({
  groupId,
  name,
  description,
  currency,
  trigger,
}: {
  groupId: string;
  name: string;
  description: string;
  currency: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
          <DialogDescription>Change the group name, description, or currency.</DialogDescription>
        </DialogHeader>

        {open && (
          <EditGroupForm
            groupId={groupId}
            initialName={name}
            initialDescription={description}
            initialCurrency={currency}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditGroupForm({
  groupId,
  initialName,
  initialDescription,
  initialCurrency,
  onDone,
}: {
  groupId: string;
  initialName: string;
  initialDescription: string;
  initialCurrency: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateGroupAction, {});

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initialName} placeholder="Weekend trip" />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="description"
          name="description"
          defaultValue={initialDescription}
          placeholder="Trip notes"
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={initialCurrency}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {state.fieldErrors?.currency && (
          <p className="text-sm text-destructive">{state.fieldErrors.currency[0]}</p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

