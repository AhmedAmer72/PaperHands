"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  ["/how-it-works", "How"],
  ["/commitment", "Commitment"],
  ["/paperhands-index", "Index"],
  ["/economy", "Economy"],
  ["/explorer", "Activity"],
  ["/lab", "Lab"],
  ["/rules", "Rules"],
  ["/faq", "FAQ"],
];

export function PageNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Product pages">
      {PAGES.map(([href, label]) => {
        const on = path === href;
        return (
          <Link
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-forest text-cream" : "bg-white text-ink/70 shadow-[0_0_40px_#00000010]"}`}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header>
      <PageNav />
      <p className="eyebrow mt-8">{eyebrow}</p>
      <h1 className="display-md mt-3 max-w-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/75">{lede}</p>
    </header>
  );
}

export function Stat({ label, value, note, tone = "paper" }: { label: string; value: string; note?: string; tone?: "paper" | "forest" | "pink" | "ink" }) {
  const toneClass = tone === "forest"
    ? "bg-forest text-cream"
    : tone === "pink"
      ? "bg-pink text-ink"
      : tone === "ink"
        ? "bg-charcoal text-cream"
        : "card text-ink";
  return (
    <article className={`rounded-[1.6rem] p-5 ${toneClass}`}>
      <p className={`text-xs uppercase tracking-wide ${tone === "paper" ? "text-ink/50" : "opacity-75"}`}>{label}</p>
      <p className="mt-2 break-words font-display text-3xl leading-none md:text-4xl">{value}</p>
      {note ? <p className={`mt-2 text-xs ${tone === "paper" ? "text-ink/55" : "opacity-80"}`}>{note}</p> : null}
    </article>
  );
}

export function PhaseTrack({ phase }: { phase: string | null }) {
  const steps = [
    ["scheduled", "Scheduled"],
    ["entry", "Entry"],
    ["commitment", "Locked"],
    ["ended", "Ended"],
  ];
  const known = steps.some(([id]) => id === phase);
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {steps.map(([id, label], index) => {
        const on = phase === id;
        return (
          <li className={`rounded-2xl px-4 py-3 ${on ? "bg-pink text-ink" : "bg-white/10 text-cream"}`} key={id}>
            <p className="font-display text-2xl">{String(index + 1).padStart(2, "0")}</p>
            <p className="text-sm font-semibold">{label}</p>
          </li>
        );
      })}
      {phase && !known ? <li className="rounded-2xl bg-pink px-4 py-3 text-ink sm:col-span-4">Contract phase: {phase}</li> : null}
    </ol>
  );
}
