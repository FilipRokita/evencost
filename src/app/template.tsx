import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300 ease-out motion-reduce:animate-none">
      {children}
    </div>
  );
}
