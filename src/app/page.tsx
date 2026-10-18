import Link from "next/link";
import { Handshake, Receipt, Scale } from "lucide-react";
import { Logo } from "@/components/logo";

const NODES = [
  [110, 33],
  [168.9, 75.8],
  [146.4, 145.2],
  [73.6, 145.2],
  [51.1, 75.8],
] as const;

const COLOURS = ["#0d9488", "#d97706", "#7c3aed", "#0284c7", "#e11d48"];
const INITIALS = ["F", "A", "K", "M", "T"];

function Graph({
  edges,
  stroke,
  width,
}: {
  edges: readonly (readonly [number, number])[];
  stroke: string;
  width: number;
}) {
  return (
    <svg viewBox="0 0 220 190" className="block h-auto w-full" aria-hidden="true">
      {edges.map(([a, b]) => {
        const [ax, ay] = NODES[a];
        const [bx, by] = NODES[b];
        const cx = (ax + bx) / 2 + (by - ay) * 0.18;
        const cy = (ay + by) / 2 - (bx - ax) * 0.18;
        return (
          <path
            key={`${a}-${b}`}
            d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="16" fill={COLOURS[i]} />
          <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
            {INITIALS[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

const FEATURES = [
  {
    icon: Receipt,
    title: "Log expenses in seconds",
    body: "Amount, who paid, who's in. Add a line from a bottom sheet, with no form to hunt for.",
  },
  {
    icon: Scale,
    title: "Split three ways",
    body: "Equally, by exact amounts, or by percentage. Splits always sum to the total, to the cent.",
  },
  {
    icon: Handshake,
    title: "Settle with one tap",
    body: "One tap records the optimized transfers. Or settle just part of it. Settlements are transfers, not checkboxes.",
  },
];

const STEPS = [
  { n: "1", title: "Create a group", body: "Name it, pick a currency, share one invite link with the crew." },
  { n: "2", title: "Add what everyone paid", body: "Balances update live as expenses land." },
  { n: "3", title: "Settle up", body: "EvenCost shows the simplified transfers. Confirm them and everyone's at zero." },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <nav className="flex items-center gap-4 py-5">
        <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Logo />
          EvenCost
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/signin?mode=signup"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Get started
          </Link>
          <Link
            href="/signin?mode=signin"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Log in
          </Link>
        </div>
      </nav>

      <section className="relative isolate pt-12 pb-10 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] bg-[radial-gradient(ellipse_50%_45%_at_50%_50%,rgba(52,211,153,0.18),transparent_65%)]"
        />

        <p className="mx-auto mb-5 inline-block max-w-full rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <span className="text-primary">Netting engine.</span> Debts collapse into optimized
          transfers
        </p>

        <h1 className="text-[clamp(2.2rem,7vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
          Split costs.
          <br />
          <span className="bg-linear-to-r from-primary via-emerald-300 to-emerald-200 bg-clip-text text-transparent">
            Settle once.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          Track who paid what on your trip, split it fairly, and settle up with an optimized set
          of transfers, not everyone paying everyone.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/signin?mode=signup"
            className="rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Start splitting. It&apos;s free
          </Link>
          <Link
            href="/signin?mode=signin"
            className="rounded-2xl border border-border bg-secondary px-6 py-3.5 text-base font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            I have an account
          </Link>
        </div>

        <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-3.5">
          <div className="w-[220px] rounded-2xl border border-border bg-card p-3">
            <Graph
              edges={[
                [0, 1], [0, 2], [0, 3], [0, 4], [1, 2],
                [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
              ]}
              stroke="rgba(248,113,113,0.38)"
              width={1.4}
            />
            <p className="mt-2 text-center text-[0.7rem] font-bold uppercase tracking-[0.07em] text-destructive">
              10 debts between 5 people
            </p>
          </div>
          <div className="grid size-11 place-items-center rounded-full border border-border bg-card font-bold text-primary">
            →
          </div>
          <div className="w-[220px] rounded-2xl border border-border bg-card p-3">
            <Graph
              edges={[[0, 1], [1, 2], [2, 3], [3, 4]]}
              stroke="rgba(52,211,153,0.65)"
              width={2.2}
            />
            <p className="mt-2 text-center text-[0.7rem] font-bold uppercase tracking-[0.07em] text-primary">
              4 transfers. Done.
            </p>
          </div>
        </div>
      </section>

      <h2 className="mt-20 text-center text-2xl font-extrabold tracking-[-0.02em]">
        Why EvenCost
      </h2>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-20 text-center text-2xl font-extrabold tracking-[-0.02em]">
        How it works
      </h2>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <div className="mb-3 grid size-8 place-items-center rounded-xl bg-primary/13 text-sm font-extrabold text-primary">
              {s.n}
            </div>
            <h3 className="text-base font-bold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <footer className="mt-20 flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>EvenCost. A portfolio project.</span>
        <span>Next.js · Drizzle · PostgreSQL · Netting</span>
      </footer>
    </div>
  );
}
