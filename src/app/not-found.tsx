import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-5 text-center">
      <Logo className="size-9" />
      <h1 className="mt-5 text-xl font-extrabold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page does not exist, or the group is not yours to see.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to your groups</Link>
      </Button>
    </main>
  );
}
