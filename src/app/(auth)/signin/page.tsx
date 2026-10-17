import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/session";
import { AuthForm } from "./auth-form";

// This route must block: rendering a sign-in form before knowing whether the
// visitor is already signed in would flash the wrong screen.
export const instant = false;

export default async function SignInPage() {
  // Reading the session needs a request, so this page cannot be prerendered.
  await connection();
  // Already signed in: nothing to do here.
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-base font-extrabold tracking-tight">
        <Logo />
        EvenCost
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        One account, every group you&apos;ll ever join.
      </p>

      <AuthForm />
    </main>
  );
}
