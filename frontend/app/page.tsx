"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DiamondHand, PaperHand } from "@/components/Hands";
import { type CurrentEpoch, type EpochDetail, type ProtocolBalances, contractReady, view } from "@/lib/chain";
import { deploymentBanner, durationLabel, paper, remaining } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

export default function DashboardPage() {
  const wallet = useWallet();
  const [error, setError] = useState<string | null>(contractReady());
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [balances, setBalances] = useState<ProtocolBalances | null>(null);
  const [last, setLast] = useState<EpochDetail | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (contractReady()) return;
    let cancelled = false;
    void (async () => {
      try {
        const current = await view<CurrentEpoch>("get_current_epoch");
        const books = await view<ProtocolBalances>("get_protocol_balances");
        const previous = BigInt(current.next_epoch_to_finalize);
        const settled = previous > 0n ? await view<EpochDetail>("get_epoch", { epoch_id: (previous - 1n).toString() }) : null;
        if (cancelled) return;
        setEpoch(current);
        setBalances(books);
        setLast(settled);
        setError(null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet.accountId || contractReady()) return;
    void view<string>("ft_balance_of", { account_id: wallet.accountId }).then(setBalance).catch((caught: unknown) => {
      setBalance(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    });
  }, [wallet.accountId]);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan">Diamond commitment</p>
          <h1 className="mt-2 text-4xl">Hold the paper. Or fold it.</h1>
        </div>
        <div className="flex gap-2">
          <PaperHand />
          <DiamondHand />
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-paper/80">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card label="Your PAPER" value={balance ? paper(balance) : wallet.accountId ? "unreadable" : "wallet not connected"} />
        <Card label="Epoch" value={epoch ? `${epoch.epoch_id} · ${epoch.phase}` : "—"} />
        <Card label="Time left in this phase" value={epoch ? remaining(epoch.now_ns, epoch.phase === "entry" ? epoch.entry_end_ns : epoch.end_ns) : "—"} />
        <Card label="Epoch length" value={durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)} />
        <Card label="Original cohort" value={last?.original_participants?.toString() ?? "not finalized"} />
        <Card label="Diamond hands still in" value={epoch ? "see epoch page" : "—"} />
        <Card label="Streak now / longest" value={epoch ? `${epoch.current_streak} / ${epoch.longest_streak}` : "—"} />
        <Card label="Locked principal" value={paper(balances?.locked_principal)} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="rounded-full bg-cyan px-4 py-2 text-charcoal" href="/commitment">Join this epoch</Link>
        {epoch ? <Link className="rounded-full border border-white/20 px-4 py-2" href={`/epoch/${epoch.epoch_id}`}>View epoch {epoch.epoch_id}</Link> : null}
        <Link className="rounded-full border border-white/20 px-4 py-2" href="/explorer">History</Link>
      </div>
      <p className="mt-6 text-sm text-paper/70">
        Last settlement: {last ? `epoch ${last.epoch_id}, ${last.success ? "success" : "failure"}, minted ${paper(last.minted)}, reserve burn ${paper(last.reserve_burned)}` : "none yet"}.
        Accounting difference {balances?.accounting_difference ?? "unread"}.
      </p>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-ink p-4">
      <p className="text-xs uppercase tracking-wider text-paper/50">{label}</p>
      <p className="mt-2 text-lg">{value}</p>
    </article>
  );
}
