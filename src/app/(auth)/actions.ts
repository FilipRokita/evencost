"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { pickAvatarColor } from "@/lib/avatar";
import type { FormState } from "@/lib/form-state";
import { checkRateLimit } from "@/lib/rate-limit";

const email = z.email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.");

const credentials = z.object({ email, password });
const registration = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .min(1, "Pick a nickname.")
    .max(40, "At most 40 characters."),
});

const LIMIT = { limit: 5, windowMs: 60_000 };

/**
 * Where to go after signing in. Only same-origin paths are accepted: "//evil.com"
 * and absolute URLs are exactly the open redirect this guards against.
 */
function destination(formData: FormData): string {
  const value = field(formData, "callbackUrl");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const limit = checkRateLimit(`signin:${parsed.data.email}`, LIMIT);
  if (!limit.allowed) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch {
    // One message for a wrong address and a wrong password: telling them apart
    // would confirm which addresses have accounts.
    return { error: "Invalid email or password." };
  }

  redirect(destination(formData));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registration.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
    displayName: field(formData, "displayName"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const limit = checkRateLimit(`signup:${parsed.data.email}`, LIMIT);
  if (!limit.allowed) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.displayName,
      },
    });
    userId = result.user.id;
  } catch {
    return { error: "That email is already taken." };
  }

  // Assigned once and stored, never derived later: a colour computed from list
  // position would repaint everyone when the list changes.
  await db.update(users).set({ avatarColor: pickAvatarColor() }).where(eq(users.id, userId));

  redirect(destination(formData));
}

/** The form decides which of the two to run from a hidden field. */
export async function authAction(prev: FormState, formData: FormData): Promise<FormState> {
  return formData.get("mode") === "signup"
    ? signUpAction(prev, formData)
    : signInAction(prev, formData);
}
