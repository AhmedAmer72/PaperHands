"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead, PhaseTrack } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { type CurrentEpoch, type UserEpochState, contractReady, view } from "@/lib/chain";
import { DEPOSIT_JOIN, DEPOSIT_STORAGE } from "@/lib/config";
import { durationLabel, paper, remaining } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";

export default function CommitmentPage() {
  const wallet = useWallet();
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [mine, setMine] = useState<UserEpochState | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
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
        eyebrow="Commitment"
        lede="Lock 1,000 PAPER for this epoch."
        title="Join this epoch."
      />

      <div className="rounded-[2rem] bg-forest p-6 text-cream md:p-8">
        {error ? <p className="text-sm text-cream/80">{error}</p> : null}
        <div className={error ? "mt-6" : undefined}>
          <PhaseTrack phase={epoch?.phase ?? null} />
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BandStat label="Epoch" value={epoch ? epoch.epoch_id : "—"} />
          <BandStat label="Time left" value={left} />
          <BandStat label="Your status" value={mine?.status ?? "—"} />
          <BandStat label="PAPER balance" value={wallet.accountId ? (balance ? paper(balance) : "—") : "—"} />
          <BandStat label="Epoch length" value={durationLabel(epoch?.epoch_duration_ns)} />
          <BandStat label="Entry window" value={durationLabel(epoch?.entry_window_ns)} />
        </dl>
        {epoch ? (
          <Link className="btn btn-cream mt-6" href={`/epoch/${epoch.epoch_id}`}>Finalize and claim</Link>
        ) : null}
        {!wallet.accountId ? (
          <button className="btn btn-pink mt-6" onClick={() => void wallet.connect()} type="button">
            {wallet.busy ? "Connecting…" : "Connect Testnet"}
          </button>
        ) : (
          <p className="mt-6 text-sm text-cream/80">Connected {wallet.accountId}</p>
        )}
      </div>

      <div className="card p-6 md:p-8">
        <label className="flex items-start gap-3 rounded-2xl bg-pink/40 p-4 text-sm">
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
