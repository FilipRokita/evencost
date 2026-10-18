import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "EvenCost. Split costs. Settle once.",
  description:
    "Split shared expenses in a group. Everyone adds what they paid, and EvenCost works out who owes whom and an optimized way to settle.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark font-sans", inter.variable)}>
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
