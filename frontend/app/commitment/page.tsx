"use client";

import { useEffect, useState } from "react";
import { PageHead, PhaseTrack, Stat } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { type CurrentEpoch, type UserEpochState, contractReady, view } from "@/lib/chain";
import { COMMITMENT_STORAGE_BYTES, DEPOSIT_JOIN, DEPOSIT_STORAGE, FIRST_JOIN_STORAGE_BYTES } from "@/lib/config";
import { deploymentBanner, durationLabel, paper, remaining } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";

export default function CommitmentPage() {
  const wallet = useWallet();
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [rules, setRules] = useState<{ min_participants: number; retention_numerator: number; retention_denominator: number; max_mint_per_epoch: string } | null>(null);
  const [mine, setMine] = useState<UserEpochState | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(contractReady());
  const [confirmed, setConfirmed] = useState(false);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload(accountId: string | null) {
    const current = await view<CurrentEpoch>("get_current_epoch");
    setEpoch(current);
    setRules(await view("get_economic_config"));
    if (accountId) {
      setMine(await view<UserEpochState>("get_user_epoch_state", { epoch_id: current.epoch_id, account_id: accountId }));
    }
  }

  useEffect(() => {
    if (contractReady()) return;
    void reload(wallet.accountId).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [wallet.accountId]);

  useEffect(() => {
    if (!wallet.accountId || contractReady()) return;
    void view<string>("ft_balance_of", { account_id: wallet.accountId }).then(setBalance).catch(() => setBalance(null));
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

  const left = epoch
    ? epoch.phase === "entry"
      ? remaining(epoch.now_ns, epoch.entry_end_ns)
      : epoch.phase === "commitment"
        ? remaining(epoch.now_ns, epoch.end_ns)
        : epoch.phase === "scheduled"
          ? remaining(epoch.now_ns, epoch.start_ns)
          : "window closed"
    : "—";

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Diamond commitment"
        lede="Lock exactly 1,000 PAPER for this epoch. The buttons below send the real contract methods. A transaction is not successful until the wallet and the RPC both return SuccessValue."
        title="Sign it, or don't."
      />

      <div className="rounded-[2rem] bg-forest p-6 text-cream md:p-8">
        <p className="text-sm text-cream/80">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>
        <div className="mt-6">
          <PhaseTrack phase={epoch?.phase ?? null} />
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BandStat label="Epoch" value={epoch ? epoch.epoch_id : "—"} />
          <BandStat label="Time left in phase" value={left} />
          <BandStat label="Your status" value={mine?.status ?? "no commitment read"} />
          <BandStat label="PAPER balance" value={wallet.accountId ? (balance ? paper(balance) : "unread") : "wallet off"} />
        </dl>
        {!wallet.accountId ? (
          <button className="btn btn-pink mt-6" onClick={() => void wallet.connect()} type="button">
            {wallet.busy ? "Connecting…" : "Connect Testnet"}
          </button>
        ) : (
          <p className="mt-6 text-sm text-cream/80">Connected {wallet.accountId}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="card overflow-hidden p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="card-art" height={1024} src="/assets/paperhands/illustrations/bill.png" width={764} />
          <h2 className="font-display text-4xl">Paper hands</h2>
          <ul className="mt-4 space-y-2 text-ink/80">
            <li>Leave after the entry window and before the epoch ends.</li>
            <li>Receive 950 PAPER. 25 is burned. 25 is assigned to survivors.</li>
            <li>Lose reward eligibility for that epoch. You cannot rejoin it.</li>
          </ul>
        </article>
        <article className="card forest overflow-hidden p-6 text-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="card-art" height={1024} src="/assets/paperhands/illustrations/diamond.png" width={824} />
          <h2 className="font-display text-4xl">Diamond hands</h2>
          <ul className="mt-4 space-y-2 text-cream/85">
            <li>Stay through the epoch.</li>
            <li>Claim the original 1,000 PAPER after settlement. Principal does not expire.</li>
            <li>Share the epoch mint and the survivor bonus, if the settlement assigns them.</li>
          </ul>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="This deployment" note="Read from the contract, not assumed to be 7 days" value={durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)} />
        <Stat label="Entry window" value={durationLabel(epoch?.entry_window_ns, epoch?.deployment_kind)} />
        <Stat label="Early exit" note="50% of the penalty is burned. 50% rewards whoever stays." value="950 back" />
        <Stat label="Failure rule" note="Survivors can still claim principal and any assigned rewards." value={rules ? `${rules.min_participants} accounts or ${Math.round((Number(rules.retention_numerator) / Number(rules.retention_denominator)) * 100)}%` : "—"} />
        <Stat label="Mint cap" note="Of active locked principal. Not an APY." value={rules ? paper(rules.max_mint_per_epoch) : "—"} />
        <Stat label="Storage" note={`First join writes ${FIRST_JOIN_STORAGE_BYTES} bytes. Later commitments write ${COMMITMENT_STORAGE_BYTES}. Cancel does not refund the NEAR stake.`} value="0.00067 NEAR" />
      </div>

      <div className="card p-6 md:p-8">
        <h2 className="font-display text-4xl">The signature</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">
          The wallet attaches 0.1 NEAR on join, cancel, and exit. The contract refunds the unused part. Register storage attaches 0.05 NEAR. Rewards last 30 days after finalization. The faucet pays 1,000 PAPER once per account from the reserve. It does not mint, and a new Testnet account is a new claim. It is not proof of humanity.
        </p>
        <label className="mt-6 flex items-start gap-3 rounded-2xl bg-pink/40 p-4 text-sm">
          <input checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
          <span>I understand the 1,000 PAPER lock, the 5% early-exit penalty, and that this screen shows the contract&apos;s real duration.</span>
        </label>
        <div className="mt-6 grid gap-3">
          <Action
            copy="Pays for the account record the token standard requires."
            disabled={!confirmed || wallet.busy}
            label="01"
            onClick={() => void act(() => wallet.send("storage_deposit", { account_id: null, registration_only: null }, DEPOSIT_STORAGE))}
            title="Register storage"
          />
          <Action
            copy={epoch?.faucet_enabled ? "One claim per account, from the faucet reserve." : "This deployment has the faucet off, so the button stays disabled."}
            disabled={!confirmed || wallet.busy || !epoch?.faucet_enabled}
            label="02"
            onClick={() => void act(() => wallet.send("claim_testnet_faucet", {}, DEPOSIT_STORAGE))}
            title="Claim faucet"
            warn
          />
          <Action
            copy="Transfers exactly 1,000 PAPER into the current epoch."
            disabled={!confirmed || wallet.busy}
            label="03"
            onClick={() => void act(() => wallet.send("join_epoch", {}, DEPOSIT_JOIN))}
            primary
            title="Sign join"
          />
          <Action
            copy="Only during the entry window. Returns all 1,000 PAPER. You cannot rejoin this epoch."
            disabled={!confirmed || wallet.busy}
            label="04"
            onClick={() => void act(() => wallet.send("cancel_during_entry", {}, DEPOSIT_JOIN))}
            title="Cancel entry"
          />
          <Action
            copy="After entry closes and before the epoch ends. Returns 950 PAPER."
            disabled={!confirmed || wallet.busy}
            label="05"
            onClick={() => void act(() => wallet.send("exit_early", {}, DEPOSIT_JOIN))}
            title="Exit early"
            warn
          />
        </div>
        {wallet.error ? <p className="mt-4 text-sm text-orange">{wallet.error}</p> : null}
        <Report report={report} />
      </div>
    </section>
  );
}

function BandStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#04261ccc] px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-cream/70">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function Action({
  label,
  title,
  copy,
  onClick,
  disabled,
  primary,
  warn,
}: {
  label: string;
  title: string;
  copy: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-cream p-4 sm:flex-row sm:items-center">
      <span className="num">{label}</span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-2xl">{title}</p>
        <p className="text-sm text-ink/65">{copy}</p>
      </div>
      <button
        className={primary ? "btn btn-pink" : warn ? "btn border border-orange bg-white text-orange" : "btn btn-green"}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {title}
      </button>
    </div>
  );
}
