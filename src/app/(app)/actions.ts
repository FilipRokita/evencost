"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { deleteAccount } from "@/lib/account";
import { auth } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
    repeatPassword: z.string().min(1, "Repeat the new password."),
  })
  .refine((value) => value.newPassword === value.repeatPassword, {
    message: "The new passwords do not match.",
    path: ["repeatPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Pick a password different from the current one.",
    path: ["newPassword"],
  });

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: "You are signed out." };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: field(formData, "currentPassword"),
    newPassword: field(formData, "newPassword"),
    repeatPassword: field(formData, "repeatPassword"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // A stolen session must not outlive the password it was stolen with.
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return { fieldErrors: { currentPassword: ["That is not your current password."] } };
  }

  return { success: "Password changed. Other devices have been signed out." };
}

/**
 * Needs the password as well as the session: a stolen session cookie alone must
 * not be enough to erase an account.
 */
export async function deleteAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: "You are signed out." };

  const password = field(formData, "password");
  if (!password) return { fieldErrors: { password: ["Enter your password."] } };

  const limit = checkRateLimit(`delete-account:${session.user.id}`, { limit: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  const [credential] = await db
    .select({ hash: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")))
    .limit(1);
  if (!credential?.hash || !(await verifyPassword({ password, hash: credential.hash }))) {
    return { fieldErrors: { password: ["That is not your password."] } };
  }

  const result = await deleteAccount(session.user.id);
  if (!result.ok) {
    return { error: "You own a group that other people are still in. Delete that group first." };
  }

  // The session row is already gone; this only clears the browser's cookie.
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Nothing left to sign out of.
  }
  redirect("/");
}
