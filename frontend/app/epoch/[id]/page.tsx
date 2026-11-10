"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Report } from "@/components/Report";
import { type EpochDetail, type UserEpochState, contractReady, view } from "@/lib/chain";
import { DEPOSIT_JOIN } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";

export default function EpochPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const wallet = useWallet();
  const [detail, setDetail] = useState<EpochDetail | null>(null);
  const [mine, setMine] = useState<UserEpochState | null>(null);
  const [error, setError] = useState<string | null>(contractReady());
  const [report, setReport] = useState<TxReport | null>(null);

  const accountId = wallet.accountId;
  const reload = useCallback(async () => {
    const next = await view<EpochDetail>("get_epoch", { epoch_id: id });
    setDetail(next);
    if (accountId) {
      setMine(await view<UserEpochState>("get_user_epoch_state", { epoch_id: id, account_id: accountId }));
    }
  }, [accountId, id]);

  useEffect(() => {
    if (contractReady()) return;
    void reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [reload]);

  async function call(method: string) {
    const result = await wallet.send(method, { epoch_id: id }, DEPOSIT_JOIN);
    setReport(result);
    if (result.ok) {
      try {
        await reload();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    }
  }

  return (
    <section>
      <h1 className="text-4xl">Epoch {id}</h1>
      {error ? <p className="mt-3 text-orange">{error}</p> : null}
      {detail ? (
        <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <Item term="Window" value={`${detail.start_ns} → entry ${detail.entry_end_ns} → end ${detail.end_ns}`} />
          <Item term="Phase" value={detail.phase} />
          <Item term="Original / active / exits" value={`${detail.original_participants ?? "open"} / ${detail.active_participants} / ${detail.early_exits}`} />
          <Item term="Retention" value={`${detail.retention_bps ?? "—"} bps`} />
          <Item term="Finalized" value={detail.finalized ? `yes, success ${String(detail.success)}` : "no"} />
          <Item term="Mint / per survivor" value={`${paper(detail.minted)} / ${paper(detail.reward_per_survivor)}`} />
          <Item term="Exit burn / reserve burn / dust" value={`${paper(detail.exit_burned)} / ${paper(detail.reserve_burned)} / ${paper(detail.dust_burned)}`} />
          <Item term="Bonus pool / per survivor" value={`${paper(detail.survivor_bonus_pool)} / ${paper(detail.bonus_per_survivor)}`} />
          <Item term="Reward deadline" value={detail.reward_claim_deadline_ns ?? "opens at finalization"} />
          <Item term="Your status" value={mine?.status ?? "not loaded"} />
          <Item term="Claimable principal / mint / bonus" value={mine ? `${paper(mine.claimable_principal)} / ${paper(mine.claimable_mint)} / ${paper(mine.claimable_bonus)}` : "—"} />
        </dl>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-full bg-cyan px-4 py-2 text-charcoal" onClick={() => void call("finalize_epoch")} type="button">Finalize</button>
        <button className="rounded-full border border-ink/15 px-4 py-2" onClick={() => void call("claim_principal")} type="button">Claim principal</button>
        <button className="rounded-full border border-ink/15 px-4 py-2" onClick={() => void call("claim_epoch_rewards")} type="button">Claim rewards</button>
        <button className="rounded-full border border-orange px-4 py-2" onClick={() => void call("sweep_unclaimed_epoch_rewards")} type="button">Sweep expired rewards</button>
      </div>
      <Report report={report} />
    </section>
  );
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <dt className="text-ink/50">{term}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  );
}
