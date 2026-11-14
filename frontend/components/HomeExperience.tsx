"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  type CurrentEpoch,
  type EpochDetail,
  type ProtocolBalances,
  contractReady,
  view,
  viewEpochs,
} from "@/lib/chain";
import { CONTRACT_ID } from "@/lib/config";
import { durationLabel } from "@/lib/format";
import { formatPaper } from "paperhands-simulator";
import { useWallet } from "@/lib/wallet";
import { BelowHero } from "@/components/BelowHero";
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
    <div className="px-3 pb-16 md:px-5">
      <section className="mx-auto w-full">
        <div className="hero-card">
          <header className="hero-nav">
            <nav aria-label="Primary" className="hero-nav-side hero-nav-left">
              <Link href="/get-started">Get started</Link>
              <Link href="/commitment">Commit</Link>
              <Link href="/paperhands-index">Epochs</Link>
              <Link href="/sponsors">Sponsors</Link>
            </nav>
            <Link aria-label="PaperHands home" className="hero-mark" href="/">
              <span aria-hidden className="hero-dots"><i /><i /><i /><i /><i /></span>
              PAPERHANDS
            </Link>
            <nav aria-label="More" className="hero-nav-side hero-nav-right">
              <Link href="/missions">Missions</Link>
              <Link href="/treasury">Treasury</Link>
              {wallet.accountId ? (
                <>
                  <Link href={`/profile/${wallet.accountId}`}>Profile</Link>
                  <button onClick={() => void wallet.disconnect()} type="button">Disconnect</button>
                </>
              ) : (
                <button disabled={wallet.busy} onClick={() => void wallet.connect()} type="button">
                  {wallet.busy ? <MorphingSquare className="h-4 w-4 bg-pink" message="Connecting" messagePlacement="right" /> : "Connect"}
                </button>
              )}
            </nav>
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
          <div className="hero-copy relative z-10 mx-auto max-w-3xl text-center" data-reveal="soft">
            <p className="text-sm font-semibold text-cream">Don&apos;t just hold. Prove it.</p>
            <h1 className="display mt-4">
              Weak hands.
              <br />
              <span className="marker">Strong rules.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/90 md:text-lg">
              Lock your PAPER. Stand with the community. Let your commitment speak on-chain.
            </p>
            <div className="toggle">
              <Link className="on" href="/commitment">Join this epoch</Link>
              <Link className="off" href="/sponsors">Sponsor a campaign</Link>
            </div>
            {wallet.error ? <p className="mt-4 text-sm text-pink">{wallet.error}</p> : null}
          </div>
        </div>
      </section>

      <BelowHero
        burn={amount(books?.burn_reserve)}
        clockReady={epoch != null}
        earlyReturn={earlyReturn}
        entry={durationLabel(epoch?.entry_window_ns)}
        error={error}
        loading={epoch == null && error == null}
        faucet={amount(books?.faucet_reserve)}
        hold={durationLabel(epoch?.epoch_duration_ns)}
        listings={listings}
        supply={amount(books?.total_supply)}
      />

      <footer className="mx-auto mt-20 max-w-[1100px]">
        <div className="rounded-[2rem] bg-pink p-6">
          <p className="font-display text-4xl">Join this epoch.</p>
          <Link className="btn btn-cream mt-4" href="/commitment">Join</Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <li><a href="https://near.org">NEAR Protocol</a></li>
          {CONTRACT_ID ? <li><a href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`}>Contract</a></li> : null}
        </ul>
      </footer>
    </div>
  );
}

function wait(seconds: number): CSSProperties {
  return { "--delay": `${seconds}s` } as CSSProperties;
}

function amount(units: string | null | undefined): string {
  if (!units) return "—";
  try {
    const [whole, frac = ""] = formatPaper(BigInt(units)).split(".");
    const grouped = BigInt(whole).toLocaleString("en-US");
    const trimmed = frac.replace(/0+$/, "");
    return trimmed ? `${grouped}.${trimmed} PAPER` : `${grouped} PAPER`;
  } catch {
    return "—";
  }
}
