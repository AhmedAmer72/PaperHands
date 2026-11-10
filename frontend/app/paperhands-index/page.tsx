"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Stat } from "@/components/PageChrome";
import { type CurrentEpoch, type EpochDetail, type ProtocolBalances, contractReady, view } from "@/lib/chain";
import { paper } from "@/lib/format";

export default function IndexPage() {
  const [error, setError] = useState<string | null>(contractReady());
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [rows, setRows] = useState<EpochDetail[]>([]);
  const [balances, setBalances] = useState<ProtocolBalances | null>(null);

  useEffect(() => {
    if (contractReady()) return;
    void (async () => {
      try {
        const current = await view<CurrentEpoch>("get_current_epoch");
        const books = await view<ProtocolBalances>("get_protocol_balances");
        const latest = Number(current.epoch_id);
        const ids = Array.from({ length: Math.min(latest + 1, 12) }, (_, index) => latest - index).filter((id) => id >= 0);
        const details = await Promise.all(ids.map((id) => view<EpochDetail>("get_epoch", { epoch_id: id.toString() })));
        setEpoch(current);
        setBalances(books);
        setRows(details);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
  }, []);

  const settled = rows.filter((row) => row.finalized);
  const widest = settled.reduce((max, row) => Math.max(max, row.retention_bps ?? 0), 1);
  const exits = settled.reduce((sum, row) => sum + row.early_exits, 0);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Paperhands index"
        lede="Retention, cohorts, exits, locked PAPER, burns, bonuses, and streaks. These numbers come from contract views. This page does not decide them."
        title="What the epochs actually did"
      />
      {error ? <p className="rounded-2xl bg-orange/10 px-4 py-3 text-sm text-orange">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Current streak" note={`Longest ${epoch?.longest_streak ?? "—"}`} value={epoch ? String(epoch.current_streak) : "—"} />
        <Stat label="Locked PAPER" value={paper(balances?.locked_principal)} />
        <Stat label="Supply" value={paper(balances?.total_supply)} />
        <Stat label="Exit burn" note={`Reserve ${paper(balances?.total_reserve_burned)} · dust ${paper(balances?.total_dust_burned)}`} value={paper(balances?.total_exit_burned)} />
        <Stat label="Unclaimed bonuses" value={paper(balances?.unclaimed_exit_bonuses)} />
        <Stat label="Graded mint" note={settled.length ? `${exits} early exits in the finalized rows below` : "No finalized row loaded"} value={paper(balances?.total_graded_minted)} />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-4xl">Retention</h2>
        <p className="mt-2 text-sm text-ink/65">Each bar is that epoch&apos;s retention basis points, scaled to the widest finalized epoch on this page. Open epochs are listed underneath and are not drawn as a success.</p>
        {settled.length === 0 ? <p className="mt-4 text-ink/60">No finalized epoch has been read.</p> : null}
        <ul className="mt-5 space-y-3">
          {settled.map((row) => (
            <li className="grid items-center gap-3 text-sm sm:grid-cols-[5rem_1fr_4.5rem]" key={row.epoch_id}>
              <Link className="font-semibold" href={`/epoch/${row.epoch_id}`}>#{row.epoch_id}</Link>
              <span className="h-3 rounded-full bg-cream">
                <span className="block h-3 rounded-full bg-forest" style={{ width: `${((row.retention_bps ?? 0) / widest) * 100}%` }} />
              </span>
              <span>{row.retention_bps != null ? `${(row.retention_bps / 100).toFixed(1)}%` : "—"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3">
        {rows.map((row) => (
          <Link className="card grid gap-3 p-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center" href={`/epoch/${row.epoch_id}`} key={row.epoch_id}>
            <p className="font-display text-4xl">#{row.epoch_id}</p>
            <div className="text-sm text-ink/75">
              <p>{row.finalized ? (row.success ? "Finalized success" : "Finalized failure") : row.phase}</p>
              <p className="mt-1">Original {row.original_participants ?? "open"} · active {row.active_participants} · exits {row.early_exits}</p>
            </div>
            <p className="text-sm font-semibold">{row.retention_bps != null ? `${(row.retention_bps / 100).toFixed(2)}% kept` : "Retention unread"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
