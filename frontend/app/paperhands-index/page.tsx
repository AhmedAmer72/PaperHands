"use client";

import { useEffect, useState } from "react";
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

  return (
    <section>
      <h1 className="text-4xl">Paperhands index</h1>
      <p className="mt-3 max-w-3xl text-paper/75">Retention, cohorts, exits, locked PAPER, burns, bonuses, and streaks. These numbers come from contract views. The page does not decide them.</p>
      {error ? <p className="mt-4 text-orange">{error}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-ink p-4">Current streak {epoch?.current_streak ?? "—"} / longest {epoch?.longest_streak ?? "—"}</article>
        <article className="rounded-xl bg-ink p-4">Locked {paper(balances?.locked_principal)}</article>
        <article className="rounded-xl bg-ink p-4">Exit burn {paper(balances?.total_exit_burned)} · reserve burn {paper(balances?.total_reserve_burned)} · dust {paper(balances?.total_dust_burned)}</article>
        <article className="rounded-xl bg-ink p-4">Unclaimed bonuses {paper(balances?.unclaimed_exit_bonuses)}</article>
        <article className="rounded-xl bg-ink p-4">Graded mint {paper(balances?.total_graded_minted)}</article>
        <article className="rounded-xl bg-ink p-4">Supply {paper(balances?.total_supply)}</article>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-paper/50">
            <tr>
              <th className="py-2">Epoch</th>
              <th>Original</th>
              <th>Active</th>
              <th>Exits</th>
              <th>Retention bps</th>
              <th>Success</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-white/10" key={row.epoch_id}>
                <td className="py-2">{row.epoch_id}</td>
                <td>{row.original_participants ?? "open"}</td>
                <td>{row.active_participants}</td>
                <td>{row.early_exits}</td>
                <td>{row.retention_bps ?? "—"}</td>
                <td>{row.finalized ? String(row.success) : row.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
