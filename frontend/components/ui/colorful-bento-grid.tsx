import { Gem } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BentoTone = "forest" | "cyan" | "pink" | "violet" | "lime";

export type BentoTile = {
  href: string;
  eyebrow: string;
  title: string;
  lines: string[];
  image: { src: string; width: number; height: number };
  tone: BentoTone;
  wide?: boolean;
};

const TONE: Record<BentoTone, string> = {
  forest: "bg-forest/15",
  cyan: "bg-cyan/40",
  pink: "bg-pink/70",
  violet: "bg-violet/15",
  lime: "bg-lime/75",
};

const HOVER = [
  "motion-safe:hover:scale-[1.01] motion-safe:hover:rotate-1",
  "motion-safe:hover:scale-105 motion-safe:hover:rotate-3",
  "motion-safe:hover:scale-105 motion-safe:hover:-rotate-3",
  "motion-safe:hover:scale-105 motion-safe:hover:rotate-2",
  "motion-safe:hover:scale-105 motion-safe:hover:-rotate-3",
];

const LEAN = ["-rotate-2", "rotate-3", "-rotate-3", "-rotate-2", "rotate-3"];

export function ColorfulBentoGrid({
  lede,
  stats,
  tiles,
  footer,
  children,
}: {
  lede: string;
  stats: readonly string[];
  tiles: readonly BentoTile[];
  footer?: { href: string; label: string } | null;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] bg-white p-4 shadow-[0_18px_46px_#00000010] md:p-6">
      <div className="flex w-full flex-col items-start gap-4 px-1 py-6 md:py-8">
        <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <h2 className="display-md max-w-xl text-left leading-[0.95] text-ink">
            Finalized epochs,
            <br />
            <Gem aria-hidden className="mr-2 inline-block size-9 -translate-y-1 rotate-12 fill-forest/15 text-forest md:size-11" strokeWidth={2} />
            still public.
          </h2>
          <p className="max-w-sm text-sm font-semibold leading-relaxed text-ink/55">{lede}</p>
        </div>
        {stats.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-x-6 gap-y-2 text-forest">
            {stats.map((stat) => (
              <p className="text-base font-medium" key={stat}>{stat}</p>
            ))}
          </div>
        ) : null}
      </div>

      {tiles.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          {tiles.map((tile, index) => (
            <Tile index={index} key={tile.href} tile={tile} />
          ))}
        </div>
      ) : (
        children
      )}

      {footer ? (
        <p className="mt-5 px-1 text-sm font-semibold text-forest">
          <Link className="underline decoration-pink decoration-[3px] underline-offset-4" href={footer.href}>
            {footer.label}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Tile({ tile, index }: { tile: BentoTile; index: number }) {
  const lean = LEAN[index % LEAN.length];
  return (
    <Link
      className={cn(
        "group relative flex overflow-hidden rounded-[1.4rem] border border-ink/10 px-4 py-6 transition-all duration-200 ease-in-out",
        "hover:z-20 hover:shadow-[-6px_6px_32px_8px_rgba(70,30,16,0.12)]",
        HOVER[index % HOVER.length],
        TONE[tile.tone],
        tile.wide
          ? "min-h-[22rem] flex-col items-start justify-between gap-4 md:col-span-2 md:h-[330px] md:flex-row md:items-center md:px-5"
          : "min-h-[22rem] flex-col items-center justify-between md:h-[330px]",
      )}
      href={tile.href}
    >
      <div className={cn("flex flex-col gap-1", tile.wide ? "items-start" : "items-center text-center")}>
        <p className={cn("mb-1 text-sm text-ink", lean)}>{tile.eyebrow}</p>
        <h3 className={cn("rounded-full bg-ink px-6 py-2 text-center font-display text-3xl leading-none tracking-wide text-cream uppercase", lean)}>
          {tile.title}
        </h3>
        <div className={cn("mt-3 text-sm text-ink/70", tile.wide ? "text-left" : "text-center")}>
          {tile.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <div className={cn("flex w-full items-end justify-center", tile.wide && "md:w-auto md:shrink-0")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-32 w-auto object-contain motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105 md:h-40"
          height={tile.image.height}
          src={tile.image.src}
          width={tile.image.width}
        />
      </div>
    </Link>
  );
}
