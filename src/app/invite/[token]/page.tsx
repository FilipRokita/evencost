import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { joinByToken } from "@/lib/invite";
import { getSession } from "@/lib/session";

// Joining is a write, so this route must not be prerendered or cached.
export const instant = false;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  await connection();

  const session = await getSession();
  if (!session) {
    // Come back here after signing in. The path is ours, not the visitor's, so
    // there is no redirect to validate.
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const groupId = await joinByToken(token, session.user.id);
  if (!groupId) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-5 text-center">
        <Logo className="size-9" />
        <h1 className="mt-5 text-xl font-extrabold tracking-tight">This link no longer works</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It was revoked or has expired. Ask whoever invited you for a new one.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to your groups</Link>
        </Button>
      </main>
    );
  }

  redirect(`/groups/${groupId}`);
}
