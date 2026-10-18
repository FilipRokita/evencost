"use client";

import { useActionState, useState } from "react";
import { authAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";

type Mode = "signup" | "signin";

export function AuthForm({
  callbackUrl,
  initialMode = "signup",
}: {
  callbackUrl?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const signup = mode === "signup";

  return (
    // Reserve the taller sign-up height so switching tabs does not move the
    // vertically centered card.
    <div className="min-h-[29rem]">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {signup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {signup
          ? "One account, every group you'll ever join."
          : "Sign in to pick up where you left off."}
      </p>

      <div className="mb-6 flex gap-1 rounded-xl bg-secondary p-1" role="tablist">
        {(
          [
            ["signup", "Sign up"],
            ["signin", "Log in"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              mode === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Keyed by mode: switching tabs must drop the other form's error state. */}
      <AuthFields key={mode} mode={mode} callbackUrl={callbackUrl} />
    </div>
  );
}

function AuthFields({ mode, callbackUrl }: { mode: Mode; callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(authAction, {});
  const signup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {signup && (
        <div className="space-y-2">
          <Label htmlFor="displayName">Nickname</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            placeholder="How the group will see you"
          />
          {state.fieldErrors?.displayName && (
            <p className="text-sm text-destructive">{state.fieldErrors.displayName[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        {state.fieldErrors?.email && (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder="At least 8 characters"
        />
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {signup && (
        <p className="text-sm text-muted-foreground">
          Your email is used only to log in. The group never sees it.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "One moment…" : signup ? "Create account" : "Log in"}
      </Button>
    </form>
  );
}
