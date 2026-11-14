"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  type CurrentEpoch,
  type EpochDetail,
  type ProtocolBalances,
  contractReady,
  view,
  viewEpochs,
} from "@/lib/chain";
import { durationLabel, paper } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { BelowHero } from "@/components/BelowHero";
import { Wordmark } from "@/components/Wordmark";
import { MorphingSquare } from "@/components/ui/morphing-square";

type Economics = {
  initial_supply: string;
  faucet_cap: string;
  max_mint_per_epoch: string;
  min_participants: number;
  retention_numerator: number;
  retention_denominator: number;
  early_exit_penalty_bps: number;
};

export function HomeExperience() {
  const wallet = useWallet();
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [books, setBooks] = useState<ProtocolBalances | null>(null);
  const [history, setHistory] = useState<EpochDetail[]>([]);
  const [economics, setEconomics] = useState<Economics | null>(null);
  const [error, setError] = useState<string | null>(contractReady());

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-inview"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (contractReady()) return;
    let cancelled = false;
    void (async () => {
      try {
        const current = await view<CurrentEpoch>("get_current_epoch");
        const balances = await view<ProtocolBalances>("get_protocol_balances");
        const config = await view<Economics>("get_economic_config");
        if (cancelled) return;
        setEpoch(current);
        setBooks(balances);
        setEconomics(config);
        setError(null);
        const details = await viewEpochs(0, Number(current.epoch_id));
        if (cancelled) return;
        setHistory(details.filter((item) => item.finalized));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const listings = [...history].reverse().slice(0, 9);
  const earlyReturn = economics
    ? `${(1000 * (10000 - economics.early_exit_penalty_bps) / 10000).toLocaleString()} PAPER`
    : "950 PAPER";

  return (
    <div className="px-3 md:px-5">
      <section className="mx-auto w-full">
        <div className="hero-card">
          <header className="hero-nav">
            <div className="hero-nav-side" />
            <Link aria-label="PaperHands home" className="hero-mark" href="/">
              <Wordmark className="h-12 w-auto text-cream sm:h-14" />
            </Link>
            <div className="hero-nav-side hero-nav-right">
              {wallet.accountId ? (
                <>
                  <Link className="btn btn-cream px-3 text-xs" href={`/profile/${wallet.accountId}`}>Your profile</Link>
                  <button className="btn btn-cream px-3 text-xs" onClick={() => void wallet.disconnect()} type="button">Disconnect</button>
                </>
              ) : (
                <button className="btn btn-pink px-3 text-xs" disabled={wallet.busy} onClick={() => void wallet.connect()} type="button">
                  {wallet.busy ? <MorphingSquare className="h-4 w-4 bg-ink" message="Connecting" messagePlacement="right" /> : "Connect Testnet"}
                </button>
              )}
            </div>
          </header>
          <div className="hero-hands" aria-hidden>
            <div className="hand hand-paper" data-reveal="hand" style={wait(0.15)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" height={1024} src="/assets/paperhands/illustrations/bill.png" width={765} />
            </div>
            <div className="hand hand-diamond" data-reveal="hand" style={wait(0.4)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" height={1024} src="/assets/paperhands/illustrations/diamond.png" width={775} />
            </div>
          </div>
          <div className="hero-copy relative z-10 text-center" data-reveal="soft">
            <p className="text-base font-semibold text-cream md:text-lg">Don&apos;t just hold. Prove it.</p>
            <h1 className="display hero-title mt-6 md:mt-8">
              <FitLine>Weak hands.</FitLine>
              <FitLine mark>Strong rules.</FitLine>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/90 md:text-lg">
              Lock your PAPER. Stand with the community. Let your commitment speak on-chain.
            </p>
            <div className="toggle">
              <Link className="on" href="/commitment">Join this epoch</Link>
              <Link className="off" href="/docs">Docs</Link>
            </div>
            {wallet.error ? <p className="mt-4 text-sm text-pink">{wallet.error}</p> : null}
          </div>
        </div>
      </section>

      <BelowHero
        burn={paper(books?.burn_reserve)}
        clockReady={epoch != null}
        earlyReturn={earlyReturn}
        entry={durationLabel(epoch?.entry_window_ns)}
        error={error}
        loading={epoch == null && error == null}
        faucet={paper(books?.faucet_reserve)}
        hold={durationLabel(epoch?.epoch_duration_ns)}
        listings={listings}
        supply={paper(books?.total_supply)}
      />
    </div>
  );
}

function wait(seconds: number): CSSProperties {
  return { "--delay": `${seconds}s` } as CSSProperties;
}

function FitLine({ children, mark = false }: { children: string; mark?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return;

    let fitted = 0;
    const fit = () => {
      const available = outer.clientWidth;
      if (available <= 0) return;
      inner.style.fontSize = "100px";
      const needed = inner.scrollWidth;
      if (needed <= 0) return;
      const next = (available / needed) * 99.2;
      if (fitted > 0 && Math.abs(next - fitted) < 0.4) {
        inner.style.fontSize = `${fitted}px`;
        return;
      }
      fitted = next;
      inner.style.fontSize = `${next}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) fit();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [children]);

  return (
    <span className={mark ? "hero-line hero-line-mark" : "hero-line"} ref={box}>
      <span ref={text}>{children}</span>
    </span>
  );
}

