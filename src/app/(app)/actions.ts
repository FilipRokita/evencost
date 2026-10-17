"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
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
