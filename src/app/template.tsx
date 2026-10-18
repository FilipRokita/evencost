import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      {children}
    </div>
  );
}
