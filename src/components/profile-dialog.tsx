"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound, LogOut, Trash2 } from "lucide-react";
import { changePasswordAction, deleteAccountAction, signOutAction } from "@/app/(app)/actions";
import { Avatar } from "@/components/avatar";
import { ConfirmSubmit } from "@/components/confirm-submit";
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
 * The account sheet. It is the only route to changing a password, signing out
 * or deleting the account, which is why the avatar in the dashboard header
 * opens it.
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
  const [deleteState, deleteAction] = useActionState<FormState, FormData>(
    deleteAccountAction,
    {},
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Profile</DialogTitle>
        <DialogDescription>Your account and password.</DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
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

        <form id="delete-account" action={deleteAction} className="space-y-3 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete account
          </p>
          <p className="text-sm text-muted-foreground">
            Removes your email, password and sign-ins. Expenses you were part of stay in your
            groups under &quot;Deleted user&quot;, so everyone&apos;s balances still add up.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="deletePassword">Your password</Label>
            <Input
              id="deletePassword"
              name="password"
              type="password"
              autoComplete="current-password"
            />
            {deleteState.fieldErrors?.password?.[0] && (
              <p className="text-sm text-destructive">{deleteState.fieldErrors.password[0]}</p>
            )}
          </div>
          {deleteState.error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {deleteState.error}
            </p>
          )}
          <ConfirmSubmit
            formId="delete-account"
            label="Delete account"
            title="Delete your account?"
            description="This cannot be undone. You will be signed out and your email can no longer be used to log in."
            className="w-full"
          />
        </form>

        <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </DialogBody>
    </>
  );
}
