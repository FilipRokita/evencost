import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/session";
import { AuthForm } from "./auth-form";

// This route must block: rendering a sign-in form before knowing whether the
// visitor is already signed in would flash the wrong screen.
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const { callbackUrl, mode } = await searchParams;
  // Reading the session needs a request, so this page cannot be prerendered.
  await connection();
  // Already signed in: nothing to do here.
  if (await getSession()) redirect("/dashboard");

  const initialMode = mode === "signin" ? "signin" : "signup";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-base font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Logo />
        EvenCost
      </Link>

      <AuthForm
        key={initialMode}
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
        initialMode={initialMode}
      />
    </main>
  );
}
