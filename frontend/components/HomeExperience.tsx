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
import { deploymentBanner, durationLabel, paper } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

type LocalTx = { hash: string | null; method: string; ok: boolean; detail: string; at?: number };

type Economics = {
  initial_supply: string;
  faucet_cap: string;
  max_mint_per_epoch: string;
  min_participants: number;
  retention_numerator: number;
  retention_denominator: number;
  early_exit_penalty_bps: number;
};

const STEPS = [
  ["01", "Connect wallet", "A Testnet wallet opens only when you ask it to. This page never marks a transaction successful on its own."],
  ["02", "Commit 1,000 PAPER", "The contract transfers exactly 1,000 PAPER and stores the commitment. The first join in an epoch writes 274 bytes; later joins write 67."],
  ["03", "Stay diamond", "After the entry window, leaving returns 950 PAPER. 25 is burned and 25 is assigned to whoever stays."],
  ["04", "Retention target", "Success needs at least 25 original accounts and survivors × 100 ≥ original × 80. Eighty percent passes exactly."],
  ["05", "Rewards are calculated", "The mint is 1% of active locked principal, capped at 500 PAPER, split equally. Unassigned remainder is not minted."],
  ["06", "Claim principal and rewards", "Principal never expires. Rewards last 30 days after that epoch is finalized, then a sweep can burn what was not claimed."],
];

export function HomeExperience() {
  const wallet = useWallet();
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [books, setBooks] = useState<ProtocolBalances | null>(null);
  const [history, setHistory] = useState<EpochDetail[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<EpochDetail | null>(null);
  const [economics, setEconomics] = useState<Economics | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(contractReady());
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem("paperhands.txs") || "[]") as LocalTx[];
    setLocalTxs(stored);
  }, [wallet.accountId]);

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
    if (contractReady()) {
      setHistoryLoaded(true);
      return;
    }
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
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet.accountId || contractReady()) return;
    void view<string>("ft_balance_of", { account_id: wallet.accountId }).then(setBalance).catch(() => setBalance(null));
  }, [wallet.accountId]);

  const last = history.at(-1) ?? null;
  const successes = history.filter((item) => item.success === true).length;
  const failures = history.filter((item) => item.finalized && item.success === false).length;
  const exits = history.reduce((sum, item) => sum + item.early_exits, 0);
  const widest = history.reduce((max, item) => Math.max(max, item.retention_bps ?? 0), 1);

  return (
    <div className="px-3 pb-16 md:px-5">
      <section className="mx-auto w-full">
        <div className="hero-card">
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
            <p className="text-sm font-semibold text-lime">Don&apos;t just hold. Prove it.</p>
            <h1 className="display mt-4">
              Weak hands.
              <br />
              <span className="marker">Strong rules.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/90 md:text-lg">
              Lock your PAPER. Stand with the community. Let your commitment speak on-chain.
            </p>
            <div className="toggle">
              <Link className="on" href="/commitment">Join Diamond Commitment</Link>
              <Link className="off" href="/sponsors">Sponsor a campaign</Link>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/80">
              A sponsor campaign is a second 1,000 PAPER lock. It does not extend the Diamond streak.
            </p>
            <p className="mt-4 text-sm text-cream/80">
              {wallet.accountId
                ? `Connected ${wallet.accountId}. Balance ${balance ? paper(balance) : "unread"}.`
                : "Wallet not connected. Connect Testnet before you join."}
            </p>
          </div>
          <dl className="hero-stats relative z-10 mx-auto mt-8 grid max-w-4xl gap-3 text-left sm:grid-cols-4">
            <HeroStat label="Current epoch" value={epoch ? `${epoch.epoch_id} · ${epoch.phase}` : "—"} />
            <HeroStat label="Last retention" value={last?.retention_bps != null ? `${(last.retention_bps / 100).toFixed(2)}%` : "not settled"} />
            <HeroStat label="Active this epoch" value={currentDetail ? String(currentDetail.active_participants) : "—"} />
            <HeroStat label="Current streak" value={epoch ? String(epoch.current_streak) : "—"} />
          </dl>
          <p className="relative z-10 mt-4 px-4 text-center text-sm text-cream/75">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1100px]" id="community">
        <div className="text-center" data-reveal="soft">
          <div className="mx-auto w-fit" data-reveal="hand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="h-44 w-auto" height={847} src="/assets/paperhands/illustrations/handshake.png" width={894} />
          </div>
          <p className="eyebrow mt-2">Live community</p>
        <h2 className="display-md mt-3 text-center">
          The cohort, <span className="marker">not a guess</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-ink/75">
          These figures are contract views. If the contract is not connected, the cells stay empty. Nothing here is a sample community.
        </p>
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

      <section className="mx-auto mt-24 max-w-[1100px]" id="commitment">
        <div data-reveal="soft">
        <p className="eyebrow">Diamond commitment</p>
        <h2 className="display-md mt-3">
          Paper hands pay. <span className="marker">Diamond hands earn.</span>
        </h2>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="card p-6" data-reveal="tilt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="card-art" height={1024} src="/assets/paperhands/illustrations/bill.png" width={765} />
            <h3 className="mt-2 font-display text-4xl">Paper hands</h3>
            <ul className="mt-4 space-y-2 text-ink/80">
              <li>Leave after the entry window.</li>
              <li>Pay the disclosed 5% penalty.</li>
              <li>Lose reward eligibility for that epoch.</li>
            </ul>
          </article>
          <article className="card forest p-6 text-cream" data-reveal="tilt-right" style={wait(0.12)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="card-art" height={1024} src="/assets/paperhands/illustrations/diamond.png" width={775} />
            <h3 className="mt-2 font-display text-4xl">Diamond hands</h3>
            <ul className="mt-4 space-y-2 text-cream/85">
              <li>Remain committed through the epoch.</li>
              <li>Reclaim the original 1,000 PAPER after settlement.</li>
              <li>Become eligible for the epoch mint.</li>
              <li>Receive an equal share of the survivor bonus.</li>
            </ul>
          </article>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Rule delay={0} term="Commitment" value="1,000 PAPER" />
          <Rule delay={0.06} term="Production duration" value="7 days" />
          <Rule delay={0.12} term="This deployment" value={durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)} />
          <Rule delay={0.18} term="Early exit penalty" value={economics ? `${Number(economics.early_exit_penalty_bps) / 100}%` : "—"} />
          <Rule delay={0.24} term="Retention target" value={retentionLabel(economics)} />
          <Rule delay={0.3} term="Minimum participants" value={economics ? String(economics.min_participants) : "—"} />
          <Rule delay={0.36} term="Maximum epoch mint" value={economics ? paper(economics.max_mint_per_epoch) : "—"} />
        </dl>
        <p className="mt-6 max-w-3xl text-lg">
          50% of early-exit penalties are burned, while the remaining 50% rewards participants who stay committed.
        </p>
        <Link className="btn btn-green mt-6" href="/commitment">Read the rules, then sign</Link>
      </section>

      <section className="mx-auto mt-24 grid max-w-[1100px] gap-8 lg:grid-cols-[0.8fr_1.2fr]" id="how">
        <div className="lg:sticky lg:top-28 lg:self-start" data-reveal="soft">
          <p className="eyebrow">How it works</p>
          <h2 className="display-md mt-3">A path, not a pile of cards.</h2>
          <p className="mt-4 text-ink/75">Six actions. The contract is the one that moves PAPER. The buttons live on the commitment page.</p>
          <div className="mt-6 hidden w-fit lg:block" data-reveal="hand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="h-64 w-auto" height={1024} src="/assets/paperhands/illustrations/lock.png" width={747} />
          </div>
        </div>
        <ol className="grid gap-4">
          {STEPS.map(([n, title, copy], index) => (
            <li className="card flex gap-4 p-5" data-reveal style={wait(index * 0.08)} key={n}>
              <span className="num">{n}</span>
              <div>
                <h3 className="font-display text-3xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-[1100px]" id="index">
        <p className="eyebrow">Paperhands index</p>
        <h2 className="display-md mt-3">What the settled epochs actually did</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric delay={0} label="Retention, last epoch" value={last?.retention_bps != null ? `${(last.retention_bps / 100).toFixed(2)}%` : "—"} note="From get_epoch" />
          <Metric delay={0.06} label="Early exits read" value={history.length ? String(exits) : "—"} note={`Across ${history.length} finalized epochs on this page`} />
          <Metric delay={0.12} label="PAPER burned" value={paper(sumBurns(books))} note="Exit, reserve, dust, and swept burns" />
          <Metric delay={0.18} label="Survivor bonuses" value={paper(books?.unclaimed_exit_bonuses)} note="Still unclaimed" />
          <Metric delay={0.24} label="Successful epochs" value={history.length ? String(successes) : "—"} note="finalized and success" />
          <Metric delay={0.3} label="Failed epochs" value={history.length ? String(failures) : "—"} note="finalized and not success" />
          <Metric delay={0.36} label="Current streak" value={epoch ? String(epoch.current_streak) : "—"} note="" />
          <Metric delay={0.42} label="Longest streak" value={epoch ? String(epoch.longest_streak) : "—"} note="" />
        </div>
        {history.length ? (
          <div className="card mt-6 p-5">
            <p className="text-sm font-semibold">Retention by finalized epoch</p>
            <ul className="mt-4 space-y-2">
              {history.map((item) => (
                <li className="grid grid-cols-[4rem_1fr_4rem] items-center gap-3 text-sm" key={item.epoch_id}>
                  <Link className="font-semibold" href={`/epoch/${item.epoch_id}`}>#{item.epoch_id}</Link>
                  <span className="h-2 rounded-full bg-cream">
                    <span className="block h-2 rounded-full bg-forest" style={{ width: `${((item.retention_bps ?? 0) / widest) * 100}%` }} />
                  </span>
                  <span>{item.retention_bps != null ? `${(item.retention_bps / 100).toFixed(0)}%` : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-ink/70">{error ? error : historyLoaded ? "No finalized epoch has been read." : "Reading every epoch from the contract."}</p>
        )}
        <Link className="btn btn-pink mt-6" href="/paperhands-index">Open the index</Link>
      </section>

      <section className="mx-auto mt-24 max-w-[1100px]" id="tokenomics">
        <p className="eyebrow">Tokenomics</p>
        <h2 className="display-md mt-3">One million PAPER. Two reserves. No builder cut.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] bg-forest p-6 text-cream" data-reveal>
            <p className="text-sm">Initial supply</p>
            <p className="mt-3 font-display text-4xl">{economics ? paper(economics.initial_supply) : "—"}</p>
            <p className="mt-2 text-sm text-cream/80">Minted once at init. Read from the contract.</p>
          </article>
          <article className="rounded-[2rem] bg-pink p-6 text-ink" data-reveal style={wait(0.1)}>
            <p className="text-sm">Faucet reserve</p>
            <p className="mt-3 font-display text-4xl">{paper(books?.faucet_reserve)}</p>
            <p className="mt-2 text-sm">Live balance. Init cap {economics ? paper(economics.faucet_cap) : "—"}. Claims do not mint.</p>
          </article>
          <article className="rounded-[2rem] bg-charcoal p-6 text-cream" data-reveal style={wait(0.2)}>
            <p className="text-sm">Burn reserve</p>
            <p className="mt-3 font-display text-4xl">{paper(books?.burn_reserve)}</p>
            <p className="mt-2 text-sm text-cream/80">Live balance. Failed epochs burn from here.</p>
          </article>
        </div>
        <div className="card mt-4 grid gap-4 p-6 md:grid-cols-2" data-reveal="soft">
          <p>Graded emission is 1% of active locked principal, never more than 500 PAPER in one epoch. That cap is not an APY.</p>
          <p>A failed epoch can burn 250 PAPER from the reserve. Early-exit penalties split 25 burned and 25 to survivors. Dust that cannot be split evenly is burned.</p>
          <p>Supply changes only on mints and burns. Transfers, locks, refunds, and bonuses move balances.</p>
          <p>On this contract, supply is {books ? paper(books.total_supply) : "unread"}. Accounting difference {books?.accounting_difference ?? "unread"}.</p>
        </div>
        <Link className="btn btn-green mt-6" href="/economy">Open the economy page</Link>
      </section>

      <section className="mx-auto mt-24 max-w-[1100px]" id="activity">
        <p className="eyebrow">Live activity</p>
        <h2 className="display-md mt-3">Only receipts we can point at</h2>
        <p className="mt-3 max-w-2xl text-ink/75">
          Browser rows are transactions this wallet stored after an RPC SuccessValue. Settled rows are get_epoch views for every epoch from 0 through the current one. This page does not invent hashes.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card p-5" data-reveal>
            <h3 className="font-display text-3xl">This browser</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {localTxs.length === 0 ? <li className="text-ink/60">No local transactions yet.</li> : null}
              {localTxs.map((tx) => (
                <li key={`${tx.hash}-${tx.at}`}>
                  <p className="font-semibold">{tx.method} · {tx.ok ? "RPC SuccessValue" : "not confirmed"}</p>
                  <p className="break-all text-ink/70">{tx.hash ?? "no hash returned"}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5" data-reveal style={wait(0.1)}>
            <h3 className="font-display text-3xl">Settled epochs</h3>
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto text-sm">
              {history.length === 0 ? <li className="text-ink/60">{error ? error : historyLoaded ? "No finalized epoch has been read." : "Reading every epoch from the contract."}</li> : null}
              {[...history].reverse().map((item) => (
                <li key={item.epoch_id}>
                  <Link className="font-semibold text-forest" href={`/epoch/${item.epoch_id}`}>Epoch {item.epoch_id}</Link>
                  <p>{item.success ? "Finalized success" : "Finalized failure"} · {item.original_participants ?? 0} original · {item.early_exits} exits</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[800px]" id="faq">
        <p className="eyebrow">Questions</p>
        <h2 className="display-md mt-3">Before you lock it</h2>
        <div className="mt-6">
          <Faq q="What is PAPERHANDS?" a="A NEAR fungible token and one commitment protocol. You lock 1,000 PAPER for an epoch. Staying makes you eligible to claim that principal plus an equal share of the mint and of the early-exit bonuses." />
          <Faq q="What is a Diamond Commitment?" a="A voluntary lock for the current epoch. Cancelling during the entry window returns all 1,000. After that, the early-exit rule applies. You cannot rejoin the same epoch." />
          <Faq q="Can I leave early?" a="Yes, after the entry window and before the epoch ends. You receive 950 PAPER. The other 50 is split between an immediate burn and the survivor bonus." />
          <Faq q="What happens to the early-exit penalty?" a="Half is burned immediately. Half is assigned in equal shares to the accounts still active when the epoch is finalized. Dust that does not divide evenly is burned." />
          <Faq q="Can I lose my original principal?" a="An early exit returns 950, so the 50 PAPER penalty does not come back. A survivor claims the full 1,000 after finalization. Principal claims do not expire." />
          <Faq q="What happens if the epoch fails?" a="The streak resets and up to 250 PAPER burns from the reserve. Survivors can still claim principal and any mint or bonus the settlement assigned. An empty epoch fails." />
          <Faq q="How are rewards calculated?" a="If at least 25 accounts entered and at least one stayed, the mint is 1% of the survivors' locked principal, capped at 500 PAPER, divided equally. Retention can fail and the epoch can still mint." />
          <Faq q="Is PAPERHANDS Sybil-proof?" a="No. The faucet pays 1,000 PAPER once per account from the reserve. One person can use many Testnet accounts. get_faucet_status.sybil_resistant is false." />
          <Faq q="What is the difference between the Testnet demo and production?" a="Same formulas. Production is a 7 day epoch, a 24 hour entry window, and the faucet off. Demo-testnet is 1 hour, 10 minutes, and the faucet on. A demo deployment is not a seven-day production epoch." />
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-[1100px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-forest p-6 text-cream" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="ml-auto h-28 w-auto" height={211} src="/assets/paperhands/illustrations/bump.png" width={246} />
            <p className="font-display text-4xl">Weak hands. Strong rules.</p>
            <p className="mt-3 text-cream/80">PAPERHANDS on NEAR. The faucet is not Sybil-proof.</p>
          </div>
          <div className="rounded-[2rem] bg-pink p-6" data-reveal style={wait(0.12)}>
            <p className="font-display text-4xl">Ready when you are.</p>
            <Link className="btn btn-cream mt-4" href="/commitment">Join this epoch</Link>
          </div>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <li><a href="https://near.org">NEAR Protocol</a></li>
          <li><a href="https://github.com/AhmedAmer72/PaperHands">GitHub</a></li>
          <li><Link href="/rules">Token rules</Link></li>
          <li><a href="https://github.com/AhmedAmer72/PaperHands">Documentation</a></li>
          {CONTRACT_ID ? <li><a href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`}>Contract explorer</a></li> : <li>Contract explorer appears after a deployment id is set</li>}
        </ul>
        <p className="mt-4 text-xs text-ink/60">Social accounts are not configured. No extra profile links are invented here.</p>
      </footer>
    </div>
  );
}

function sumBurns(books: ProtocolBalances | null) {
  if (!books) return null;
  try {
    return (BigInt(books.total_exit_burned) + BigInt(books.total_reserve_burned) + BigInt(books.total_dust_burned) + BigInt(books.total_swept_burned)).toString();
  } catch {
    return null;
  }
}

function retentionLabel(config: Economics | null) {
  if (!config) return "—";
  const denominator = Number(config.retention_denominator);
  if (!denominator) return "—";
  return `${Math.round((Number(config.retention_numerator) / denominator) * 100)}%`;
}

function wait(seconds: number): CSSProperties {
  return { "--delay": `${seconds}s` } as CSSProperties;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#04261ccc] px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-cream/70">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
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

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="faq">
      <summary>{q}</summary>
      <p>{a}</p>
    </details>
  );
}
