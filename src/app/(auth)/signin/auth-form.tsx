"use client";

import { useActionState, useState } from "react";
import { authAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";

type Mode = "signup" | "signin";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signup");
  const [state, formAction, pending] = useActionState<FormState, FormData>(authAction, {});
  const signup = mode === "signup";

  return (
    <div>
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

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

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
    </div>
  );
}
