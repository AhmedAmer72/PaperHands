"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Stat } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { type CurrentEpoch, type EpochDetail, type UserEpochState, contractReady, view } from "@/lib/chain";
import { CONTRACT_ID, DEPOSIT_JOIN } from "@/lib/config";
import { paper, percentFromBps, timestampLabel } from "@/lib/format";
import { CONTRACT_ACCOUNT_NOTE } from "@/lib/tx-error";
import { type TxReport, useWallet } from "@/lib/wallet";

export default function EpochPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const wallet = useWallet();
  const [detail, setDetail] = useState<EpochDetail | null>(null);
  const [clock, setClock] = useState<CurrentEpoch | null>(null);
  const [mine, setMine] = useState<UserEpochState | null>(null);
  const [error, setError] = useState<string | null>(contractReady());
  const [report, setReport] = useState<TxReport | null>(null);

  const accountId = wallet.accountId;
  const reload = useCallback(async () => {
    const [next, current] = await Promise.all([
      view<EpochDetail>("get_epoch", { epoch_id: id }),
      view<CurrentEpoch>("get_current_epoch"),
    ]);
    setDetail(next);
    setClock(current);
    if (accountId) {
      setMine(await view<UserEpochState>("get_user_epoch_state", { epoch_id: id, account_id: accountId }));
    }
  }, [accountId, id]);

  useEffect(() => {
    if (contractReady()) return;
    void reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [reload]);

  const ownsContract = accountId != null && accountId === CONTRACT_ID;
  const nextToFinalize = clock?.next_epoch_to_finalize ?? null;
  const ended = detail != null && clock != null && BigInt(clock.now_ns) >= BigInt(detail.end_ns);
  const rewardWindowClosed = detail?.reward_claim_deadline_ns != null && clock != null && BigInt(clock.now_ns) >= BigInt(detail.reward_claim_deadline_ns);
  const selfMove = ownsContract ? CONTRACT_ACCOUNT_NOTE : null;
  const finalizeReason = !detail || !clock
    ? "Reading this epoch from the contract."
    : detail.finalized
      ? "This epoch is already finalized."
      : nextToFinalize !== id
        ? `Epochs finalize in order. The next epoch is ${nextToFinalize}.`
        : !ended
          ? "This epoch has not ended."
          : null;
  const principalReason = selfMove
    ?? (!detail?.finalized ? "This epoch is not finalized." : !accountId ? "Connect a wallet first." : mine?.principal_claim_open ? null : "No principal is waiting for this account.");
  const rewardReason = selfMove
    ?? (!detail?.finalized ? "This epoch is not finalized." : !accountId ? "Connect a wallet first." : detail.rewards_swept ? "Unclaimed rewards were already swept." : mine?.rewards_claim_open ? null : "No rewards are open for this account.");
  const sweepReason = !detail || !clock
    ? "Reading this epoch from the contract."
    : !detail.finalized
      ? "This epoch is not finalized."
      : detail.rewards_swept
        ? "Unclaimed rewards were already swept."
        : !rewardWindowClosed
          ? "The reward claim window is still open."
          : null;

  async function call(method: string) {
    const blocked = method === "finalize_epoch" ? finalizeReason : method === "claim_principal" ? principalReason : method === "claim_epoch_rewards" ? rewardReason : sweepReason;
    if (blocked) {
      setReport({ ok: false, hash: null, method, detail: blocked });
      return;
    }
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
    <section className="space-y-8">
      <header>
        <p className="eyebrow">Epoch record</p>
        <h1 className="display-md mt-3">Epoch {id}</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/75">
          Settlement numbers below are the contract&apos;s view of this epoch. The buttons send finalize, claim, and sweep. The contract rejects a call that is not ready. Nothing here is marked successful before both success checks.
        </p>
      </header>
      {error ? <p className="rounded-2xl bg-orange/10 px-4 py-3 text-sm text-orange">{error}</p> : null}
      <Link className="text-sm font-semibold text-forest" href="/paperhands-index">Back to the index</Link>

      {detail ? (
        <>
          <div className="rounded-[2rem] bg-forest p-6 text-cream md:p-8">
            <p className="text-sm uppercase tracking-wide text-cream/70">{detail.finalized ? (detail.success ? "Finalized success" : "Finalized failure") : detail.phase}</p>
            <p className="mt-3 font-display text-6xl">{detail.retention_bps != null ? percentFromBps(detail.retention_bps) : "Open"}</p>
            <p className="mt-2 text-sm text-cream/75">Retention. Original {detail.original_participants ?? "open"} · active {detail.active_participants} · exits {detail.early_exits}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Mint / per survivor" value={`${paper(detail.minted)} / ${paper(detail.reward_per_survivor)}`} />
            <Stat label="Bonus pool / share" value={`${paper(detail.survivor_bonus_pool)} / ${paper(detail.bonus_per_survivor)}`} />
            <Stat label="Burns" note="Exit / reserve / dust" value={`${paper(detail.exit_burned)} · ${paper(detail.reserve_burned)} · ${paper(detail.dust_burned)}`} />
            <Stat label="Your status" value={wallet.accountId ? (mine?.status ?? "—") : "wallet off"} />
            <Stat label="Claimable" note="Principal / mint / bonus" value={mine ? `${paper(mine.claimable_principal)} · ${paper(mine.claimable_mint)} · ${paper(mine.claimable_bonus)}` : "—"} />
            <Stat label="Reward deadline" value={detail.reward_claim_deadline_ns ? timestampLabel(detail.reward_claim_deadline_ns) : "opens at finalization"} />
          </div>
          <div className="card p-5 text-sm text-ink/70">
            <p className="break-all">Window {timestampLabel(detail.start_ns)} → entry {timestampLabel(detail.entry_end_ns)} → end {timestampLabel(detail.end_ns)}</p>
            <p className="mt-2">Rewards swept: {String(detail.rewards_swept)}. Unclaimed mint left {paper(detail.unclaimed_mint_remaining)}. Unclaimed bonus left {paper(detail.unclaimed_bonus_remaining)}.</p>
            {mine ? <p className="mt-2">Principal claim open: {String(mine.principal_claim_open)}. Rewards claim open: {String(mine.rewards_claim_open)}. Rewards already claimed: {String(mine.rewards_claimed)}.</p> : null}
          </div>
        </>
      ) : null}

      {nextToFinalize && nextToFinalize !== id ? (
        <p className="text-sm font-semibold text-forest">
          <Link href={`/epoch/${nextToFinalize}`}>The next epoch to finalize is {nextToFinalize}.</Link>
        </p>
      ) : null}
      {selfMove ? <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">{selfMove}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <EpochAction copy="Anyone can finalize the next finished epoch, once, in order." disabled={wallet.busy} onClick={() => void call("finalize_epoch")} reason={finalizeReason} title="Finalize" />
        <EpochAction copy="Returns the original 1,000 PAPER after settlement. Principal does not expire." disabled={wallet.busy} onClick={() => void call("claim_principal")} reason={principalReason} title="Claim principal" />
        <EpochAction copy="Pays the equal mint share and the equal survivor bonus while the 30-day window is open." disabled={wallet.busy} onClick={() => void call("claim_epoch_rewards")} reason={rewardReason} title="Claim rewards" />
        <EpochAction copy="After the reward window, burns unclaimed mint and bonus. Principal is never swept." disabled={wallet.busy} onClick={() => void call("sweep_unclaimed_epoch_rewards")} reason={sweepReason} title="Sweep expired rewards" warn />
      </div>
      <Report report={report} />
    </section>
  );
}

function EpochAction({ title, copy, reason, onClick, disabled, warn }: { title: string; copy: string; reason: string | null; onClick: () => void; disabled: boolean; warn?: boolean }) {
  return (
    <article className="card flex flex-col p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-ink/70">{copy}</p>
      {reason ? <p className="mt-3 text-sm font-semibold text-ink">{reason}</p> : null}
      <button className={warn ? "btn mt-4 border border-orange bg-white text-orange" : "btn btn-pink mt-4"} disabled={disabled || reason != null} onClick={onClick} type="button">{title}</button>
    </article>
  );
}
