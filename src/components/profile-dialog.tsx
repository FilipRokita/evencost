"use client";

import { useActionState, useState, type ReactNode } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { changePasswordAction, signOutAction } from "@/app/(app)/actions";
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
import type { FormState } from "@/lib/form-state";

const PASSWORD_FIELDS: readonly {
  name: "currentPassword" | "newPassword" | "repeatPassword";
  label: string;
  autoComplete: string;
  placeholder?: string;
}[] = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    placeholder: "At least 8 characters",
  },
  {
    name: "repeatPassword",
    label: "Repeat new password",
    autoComplete: "new-password",
  },
];

/**
 * The account sheet. It is the only route to changing a password or signing
 * out, which is why the avatar in the dashboard header opens it.
 */
export function ProfileDialog({
  name,
  avatarColor,
  trigger,
}: {
  name: string;
  avatarColor?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {/* Fresh on every open, so a previous success or error cannot reappear. */}
        {open && <ProfileContent name={name} avatarColor={avatarColor} />}
      </DialogContent>
    </Dialog>
  );
}

function ProfileContent({ name, avatarColor }: { name: string; avatarColor?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Profile</DialogTitle>
        <DialogDescription>Your account, and the password that protects it.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
        <Avatar name={name} color={avatarColor} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">This is how the group sees you.</p>
        </div>
      </div>

      <form action={formAction} className="space-y-3 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          <KeyRound className="size-3.5" aria-hidden="true" />
          Change password
        </p>

        {PASSWORD_FIELDS.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
            />
            {state.fieldErrors?.[field.name]?.[0] && (
              <p className="text-sm text-destructive">{state.fieldErrors[field.name][0]}</p>
            )}
          </div>
        ))}

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
          {pending ? "Changing…" : "Change password"}
        </Button>
      </form>

      <form action={signOutAction} className="border-t border-border pt-4">
        <Button type="submit" variant="ghost" className="w-full">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </>
  );
}
