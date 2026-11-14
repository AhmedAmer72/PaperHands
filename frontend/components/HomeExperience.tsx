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
import { durationLabel, paper } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

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
  const [currentDetail, setCurrentDetail] = useState<EpochDetail | null>(null);
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
        setCurrentDetail(details.find((item) => item.epoch_id === current.epoch_id) ?? null);
        setHistory(details.filter((item) => item.finalized));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const last = history.at(-1) ?? null;

  return (
    <div className="px-3 pb-16 md:px-5">
      <section className="mx-auto w-full">
        <div className="hero-card">
          <header className="hero-nav">
            <nav aria-label="Primary" className="hero-nav-side hero-nav-left">
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
                  {wallet.busy ? "Connecting" : "Connect"}
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

      <section className="mx-auto mt-20 max-w-[1100px]" id="community">
        <div className="text-center" data-reveal="soft">
          <div className="mx-auto w-fit" data-reveal="hand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="h-44 w-auto" height={847} src="/assets/paperhands/illustrations/handshake.png" width={894} />
          </div>
          <p className="eyebrow mt-2">Live</p>
          <h2 className="display-md mt-3 text-center">This epoch</h2>
          {error ? <p className="mt-3 text-sm text-orange">{error}</p> : null}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric delay={0} label="Original participants" value={last?.original_participants?.toString() ?? "not finalized"} note="Frozen when the entry window closed" />
          <Metric delay={0.08} label="Active participants" value={currentDetail ? String(currentDetail.active_participants) : "—"} note="Accounts still committed in the current epoch" />
          <Metric delay={0.16} label="Retention rate" value={last?.retention_bps != null ? `${(last.retention_bps / 100).toFixed(2)}%` : "not settled"} note="Last finalized epoch" />
          <Metric delay={0.24} label="Locked PAPER" value={paper(books?.locked_principal)} note="Principal sitting in the contract" />
          <Metric delay={0.32} label="Current streak" value={epoch ? String(epoch.current_streak) : "—"} note="Resets when an epoch fails" />
          <Metric delay={0.4} label="Longest streak" value={epoch ? String(epoch.longest_streak) : "—"} note="Highest run stored on the contract" />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1100px]" id="reserves">
        <p className="eyebrow">Reserves</p>
        <h2 className="display-md mt-3">Supply on this contract</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] bg-forest p-6 text-cream" data-reveal>
            <p className="text-sm">Supply</p>
            <p className="mt-3 font-display text-4xl">{books ? paper(books.total_supply) : "—"}</p>
          </article>
          <article className="rounded-[2rem] bg-pink p-6 text-ink" data-reveal style={wait(0.1)}>
            <p className="text-sm">Faucet reserve</p>
            <p className="mt-3 font-display text-4xl">{paper(books?.faucet_reserve)}</p>
          </article>
          <article className="rounded-[2rem] bg-charcoal p-6 text-cream" data-reveal style={wait(0.2)}>
            <p className="text-sm">Burn reserve</p>
            <p className="mt-3 font-display text-4xl">{paper(books?.burn_reserve)}</p>
          </article>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Rule term="Commitment" value="1,000 PAPER" />
          <Rule term="Epoch length" value={durationLabel(epoch?.epoch_duration_ns)} />
          <Rule term="Early exit penalty" value={economics ? `${Number(economics.early_exit_penalty_bps) / 100}%` : "—"} />
          <Rule term="Mint cap" value={economics ? paper(economics.max_mint_per_epoch) : "—"} />
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn btn-green" href="/commitment">Join</Link>
          <Link className="btn btn-pink" href="/paperhands-index">Open epochs</Link>
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-[1100px]">
        <div className="rounded-[2rem] bg-pink p-6" data-reveal>
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

function Metric({ label, value, note, delay = 0 }: { label: string; value: string; note: string; delay?: number }) {
  return (
    <article className="card p-5" data-reveal style={wait(delay)}>
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
      {note ? <p className="mt-2 text-xs text-ink/55">{note}</p> : null}
    </article>
  );
}

function Rule({ term, value, delay = 0 }: { term: string; value: string; delay?: number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_0_60px_#00000012]" data-reveal style={wait(delay)}>
      <dt className="text-xs uppercase tracking-wide text-ink/50">{term}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
