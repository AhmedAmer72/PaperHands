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

  const listings = [...history].reverse().slice(0, 6);
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

      <p className="calm-line">
        {epoch
          ? `${durationLabel(epoch.epoch_duration_ns)} to hold. ${durationLabel(epoch.entry_window_ns)} to enter.`
          : "The clock is read from the contract."}
      </p>

      <section className="home-block" id="rules">
        <h2 className="display-md max-w-3xl">The rule is the product.</h2>
        <div className="mission-grid">
          <article>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={1024} src="/assets/paperhands/illustrations/bill.png" width={765} />
            <h3>Lock 1,000 PAPER</h3>
            <p>One amount. It sits in the contract until you claim or exit.</p>
          </article>
          <article>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={1024} src="/assets/paperhands/illustrations/diamond.png" width={775} />
            <h3>Stay, or leave early</h3>
            <p>Stay through the epoch, or exit early and receive {earlyReturn}.</p>
          </article>
          <article>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={1024} src="/assets/paperhands/illustrations/lock.png" width={747} />
            <h3>Claim what you kept</h3>
            <p>After finalize, claim your principal and any rewards the epoch minted.</p>
          </article>
        </div>
      </section>

      <section className="home-block" id="path">
        <h2 className="display-md max-w-3xl">A path, not a pile of pages.</h2>
        <ol className="path">
          <li>
            <span>01</span>
            <div>
              <h3>Connect</h3>
              <p>Connect a testnet account and register storage on the commitment page.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Claim, then lock</h3>
              <p>Claim the faucet once. Then lock 1,000 PAPER into the open epoch.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Stay, or leave early</h3>
              <p>Stay through the epoch, or exit early and receive {earlyReturn}.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Finalize and claim</h3>
              <p>Open the closed epoch from the index. Finalize, then claim.</p>
            </div>
          </li>
        </ol>
        <Link className="btn btn-green mt-8" href="/get-started">Get started</Link>
      </section>

      <section className="home-block" id="epochs">
        <h2 className="display-md max-w-3xl">Finalized epochs</h2>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
        {listings.length === 0 ? (
          <p className="mt-6 max-w-xl text-ink/70">No finalized epoch is on the contract yet.</p>
        ) : (
          <div className="catalog">
            {listings.map((item) => (
              <Link className="listing" href={`/epoch/${item.epoch_id}`} key={item.epoch_id}>
                <p className="font-display text-3xl leading-none">Epoch {item.epoch_id}</p>
                <p className="mt-3 text-sm text-ink/70">
                  {item.retention_bps == null ? "Retention pending" : `${(item.retention_bps / 100).toFixed(2)}% stayed`}
                </p>
                <p className="mt-1 text-sm text-ink/70">{item.active_participants} still in</p>
              </Link>
            ))}
          </div>
        )}
        <dl className="reserves">
          <div>
            <dt>Supply</dt>
            <dd>{amount(books?.total_supply)}</dd>
          </div>
          <div>
            <dt>Faucet reserve</dt>
            <dd>{amount(books?.faucet_reserve)}</dd>
          </div>
          <div>
            <dt>Burn reserve</dt>
            <dd>{amount(books?.burn_reserve)}</dd>
          </div>
        </dl>
      </section>

      <section className="home-block" id="questions">
        <h2 className="display-md">Questions, answered short.</h2>
        <div className="mt-8 space-y-3">
          <details className="faq">
            <summary>What does a join lock?</summary>
            <p>1,000 PAPER, for that epoch. It stays in the contract until you claim or exit.</p>
          </details>
          <details className="faq">
            <summary>What does an early exit return?</summary>
            <p>{earlyReturn}. The rest is the early-exit penalty. It is not a reward.</p>
          </details>
          <details className="faq">
            <summary>Is a sponsor campaign the same lock?</summary>
            <p>No. A campaign locks another 1,000 PAPER in the sponsor contract. It does not count as an epoch commitment.</p>
          </details>
        </div>
      </section>

      <section className="home-block" id="roles">
        <h2 className="display-md">Three roles. No extra ones.</h2>
        <div className="roles">
          <Link href="/commitment">
            <strong>Participant</strong>
            <span>Lock 1,000 PAPER and stay, or leave early.</span>
          </Link>
          <Link href="/sponsors">
            <strong>Sponsor</strong>
            <span>Open a campaign. It is a separate 1,000 PAPER lock.</span>
          </Link>
          <Link href="/treasury">
            <strong>Treasury</strong>
            <span>Vote on a proposal. The vote is the action.</span>
          </Link>
        </div>
      </section>

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
