"use client";

import { useEffect, useState } from "react";
import { Report } from "@/components/Report";
import { type CurrentEpoch, type UserEpochState, contractReady, view } from "@/lib/chain";
import { COMMITMENT_STORAGE_BYTES, DEPOSIT_JOIN, DEPOSIT_STORAGE, FIRST_JOIN_STORAGE_BYTES } from "@/lib/config";
import { deploymentBanner, durationLabel } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";

export default function CommitmentPage() {
  const wallet = useWallet();
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [mine, setMine] = useState<UserEpochState | null>(null);
  const [error, setError] = useState<string | null>(contractReady());
  const [confirmed, setConfirmed] = useState(false);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload(accountId: string | null) {
    const current = await view<CurrentEpoch>("get_current_epoch");
    setEpoch(current);
    if (accountId) {
      setMine(await view<UserEpochState>("get_user_epoch_state", { epoch_id: current.epoch_id, account_id: accountId }));
    }
  }

  useEffect(() => {
    if (contractReady()) return;
    void reload(wallet.accountId).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [wallet.accountId]);

  async function act(run: () => Promise<TxReport>) {
    const result = await run();
    setReport(result);
    if (result.ok) {
      try {
        await reload(wallet.accountId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    }
  }

  return (
    <section className="max-w-3xl">
      <h1 className="text-4xl">Diamond commitment</h1>
      <p className="mt-3 text-paper/80">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>
      <ul className="mt-6 space-y-2 text-paper/90">
        <li>You lock exactly 1,000 PAPER. Ordinary transfers are not taxed.</li>
        <li>This deployment&apos;s epoch is {durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)}.</li>
        <li>Entry window: {durationLabel(epoch?.entry_window_ns, epoch?.deployment_kind)}.</li>
        <li>Phase now: {epoch?.phase ?? "unread"}. Your status: {mine?.status ?? "no commitment read"}.</li>
        <li>Early exit returns 950, burns 25, and assigns 25 to that epoch&apos;s survivor bonus.</li>
        <li>If the cohort misses 25 people or 80% retention, the epoch fails, the streak resets, and up to 250 PAPER burns from the reserve. Survivors can still claim principal and any rewards.</li>
        <li>Graded mint is 1% of active locked principal, capped at 500 PAPER per epoch, split equally. It is not a guaranteed APY.</li>
        <li>Principal of 1,000 PAPER never expires. Rewards expire 30 days after finalization.</li>
        <li>
          Joining stores a {COMMITMENT_STORAGE_BYTES}-byte commitment record, about 0.00067 NEAR.
          The first join in an epoch also writes the epoch record ({FIRST_JOIN_STORAGE_BYTES} bytes measured for that call).
          The wallet attaches 0.1 NEAR and the contract refunds the unused part. Cancelling does not refund the NEAR storage stake.
        </li>
      </ul>
      <label className="mt-6 flex items-start gap-3 text-sm">
        <input checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
        <span>I understand the 1,000 PAPER lock, the 5% early-exit penalty, and that this screen shows the contract&apos;s real duration.</span>
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-full border border-white/20 px-4 py-2" disabled={!confirmed || wallet.busy} onClick={() => void act(() => wallet.send("storage_deposit", { account_id: null, registration_only: null }, DEPOSIT_STORAGE))} type="button">
          Register storage
        </button>
        <button className="rounded-full border border-orange/60 px-4 py-2" disabled={!confirmed || wallet.busy || !epoch?.faucet_enabled} onClick={() => void act(() => wallet.send("claim_testnet_faucet", {}, DEPOSIT_STORAGE))} type="button">
          Claim faucet
        </button>
        <button className="rounded-full bg-cyan px-4 py-2 text-charcoal" disabled={!confirmed || wallet.busy} onClick={() => void act(() => wallet.send("join_epoch", {}, DEPOSIT_JOIN))} type="button">
          Sign join
        </button>
        <button className="rounded-full border border-white/20 px-4 py-2" disabled={!confirmed || wallet.busy} onClick={() => void act(() => wallet.send("cancel_during_entry", {}, DEPOSIT_JOIN))} type="button">
          Cancel entry
        </button>
        <button className="rounded-full border border-orange px-4 py-2" disabled={!confirmed || wallet.busy} onClick={() => void act(() => wallet.send("exit_early", {}, DEPOSIT_JOIN))} type="button">
          Exit early
        </button>
      </div>
      <p className="mt-3 text-xs text-paper/60">The faucet pays 1,000 PAPER once per account from the reserve. It does not mint. A new Testnet account is a new claim. It is not proof of humanity.</p>
      {wallet.error ? <p className="mt-3 text-sm text-orange">{wallet.error}</p> : null}
      <Report report={report} />
    </section>
  );
}
