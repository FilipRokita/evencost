"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-in fade-in-0 slide-in-from-bottom-3 duration-[250ms] ease-out motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
