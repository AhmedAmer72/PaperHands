"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, Stat } from "@/components/PageChrome";
import { type CurrentEpoch, type EpochDetail, type ProtocolBalances, contractReady, view, viewEpochs } from "@/lib/chain";
import { paper, percentFromBps } from "@/lib/format";

export default function IndexPage() {
  const [error, setError] = useState<string | null>(contractReady());
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [rows, setRows] = useState<EpochDetail[]>([]);
  const [balances, setBalances] = useState<ProtocolBalances | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (contractReady()) return;
    void (async () => {
      try {
        const current = await view<CurrentEpoch>("get_current_epoch");
        const books = await view<ProtocolBalances>("get_protocol_balances");
        const details = await viewEpochs(0, Number(current.epoch_id));
        details.reverse();
        setEpoch(current);
        setBalances(books);
        setRows(details);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
  }, []);

  const selectedId = picked ?? rows.find((row) => row.finalized)?.epoch_id ?? rows[0]?.epoch_id ?? "";
  const selected = rows.find((row) => row.epoch_id === selectedId) ?? null;

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Epochs"
        lede="Pick an epoch. Retention, who stayed, and who left come from the contract."
        title="What the epochs did"
      />
      {error ? <p className="rounded-2xl bg-orange/10 px-4 py-3 text-sm text-orange">{error}</p> : null}
      {epoch ? <p className="text-sm font-semibold text-forest">Streak {epoch.current_streak}. Longest {epoch.longest_streak}.</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Supply" value={paper(balances?.total_supply)} />
        <Stat label="Locked" value={paper(balances?.locked_principal)} />
        <Stat label="Exit burn" value={paper(balances?.total_exit_burned)} />
      </div>
      {balances ? (
        <p className="text-sm text-ink/65">
          Minted {paper(balances.total_graded_minted)}. Reserve {paper(balances.total_reserve_burned)}.
        </p>
      ) : null}

      <div className="card p-6">
        <label className="grid gap-2 text-sm font-semibold" htmlFor="epoch-picker">
          Epoch
          <select
            className="control text-base"
            disabled={rows.length === 0}
            id="epoch-picker"
            value={selectedId}
            onChange={(event) => setPicked(event.target.value)}
          >
            {rows.length === 0 ? <option value="">{epoch ? "No epoch has been read" : "Reading epochs"}</option> : null}
            {rows.map((row) => (
              <option key={row.epoch_id} value={row.epoch_id}>
                {epochOption(row)}
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div aria-live="polite" className="mt-6">
            <p className="text-sm font-semibold text-forest">{epochStatus(selected)}</p>
            <p className="mt-2 font-display text-6xl leading-none">{selected.retention_bps != null ? percentFromBps(selected.retention_bps) : "Open"}</p>
            <p className="mt-3 text-sm text-ink/70">
              {selected.active_participants} still in · {selected.early_exits} left early
              {selected.original_participants != null ? ` · ${selected.original_participants} started` : ""}
            </p>
            <Link className="btn btn-pink mt-5" href={`/epoch/${selected.epoch_id}`}>Open epoch {selected.epoch_id}</Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink/60">{epoch ? "No epoch has been read." : "Reading every epoch from the contract."}</p>
        )}
      </div>
    </section>
  );
}

function epochOption(row: EpochDetail): string {
  if (row.retention_bps != null) return `Epoch ${row.epoch_id} · ${percentFromBps(row.retention_bps)} stayed`;
  return `Epoch ${row.epoch_id} · ${prettyPhase(row.phase)}`;
}

function epochStatus(row: EpochDetail): string {
  if (!row.finalized) return prettyPhase(row.phase);
  return row.success ? "Finalized success" : "Finalized failure";
}

function prettyPhase(phase: string): string {
  if (!phase) return "Open";
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}
