"use client";

import { useEffect, useState } from "react";
import { PageHead, Stat } from "@/components/PageChrome";
import { type CurrentEpoch, type ProtocolBalances, contractReady, view } from "@/lib/chain";
import { deploymentBanner, durationLabel, paper } from "@/lib/format";

type Config = Record<string, string | number | boolean>;

const LABELS: Record<string, string> = {
  contract_token_balance: "Contract PAPER balance",
  burn_reserve: "Burn reserve",
  faucet_reserve: "Faucet reserve",
  locked_principal: "Locked principal",
  unclaimed_mint_rewards: "Unclaimed mint",
  unclaimed_exit_bonuses: "Unclaimed bonuses",
  accounting_difference: "Accounting difference",
  total_supply: "Total supply",
  total_graded_minted: "Graded mint",
  total_exit_burned: "Exit burn",
  total_reserve_burned: "Reserve burn",
  total_dust_burned: "Dust burn",
  total_swept_burned: "Swept rewards",
};

export default function EconomyPage() {
  const [error, setError] = useState<string | null>(contractReady());
  const [config, setConfig] = useState<Config | null>(null);
  const [balances, setBalances] = useState<ProtocolBalances | null>(null);
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);

  useEffect(() => {
    if (contractReady()) return;
    void (async () => {
      try {
        setConfig(await view<Config>("get_economic_config"));
        setBalances(await view<ProtocolBalances>("get_protocol_balances"));
        setEpoch(await view<CurrentEpoch>("get_current_epoch"));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
  }, []);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Token economy"
        lede="Initial supply and the faucet cap are the amounts stored at deployment. The reserve cards are the live balances. This page does not rebuild a per-transaction mint and burn ledger."
        title="Books from the contract."
      />
      <p className="max-w-3xl text-sm text-ink/70">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Initial supply" note="Minted once at init. 8 decimals." tone="forest" value={config ? paper(String(config.initial_supply)) : "—"} />
        <Stat label="Faucet reserve" note={config ? `Init cap ${paper(String(config.faucet_cap))}. Claims spend this reserve.` : "Live balance. Claims do not mint."} tone="pink" value={paper(balances?.faucet_reserve)} />
        <Stat label="Burn reserve" note="Live balance. Failed epochs burn from here." tone="ink" value={paper(balances?.burn_reserve)} />
      </div>

      <div className="card grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="font-display text-4xl">How supply moves</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/75">Graded emission is 1% of active locked principal, never more than 500 PAPER in one epoch. A failed epoch can burn 250 PAPER from the reserve. Early-exit penalties split 25 burned and 25 to survivors. Dust that cannot be split evenly is burned.</p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="rounded-2xl bg-cream px-4 py-3">This deployment&apos;s epoch length: {durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)}.</p>
          <p className="rounded-2xl bg-cream px-4 py-3">Live supply: {balances ? paper(balances.total_supply) : "unread"}.</p>
          <p className="rounded-2xl bg-cream px-4 py-3">Accounting difference: {balances?.accounting_difference ?? "unread"}.</p>
          <p className="rounded-2xl bg-cream px-4 py-3">Theoretical maximum emission is 500 PAPER × 52 epochs = 26,000 PAPER in a year of seven-day epochs, before burns. That is not a guaranteed APY.</p>
        </div>
      </div>

      <p className="max-w-3xl text-sm text-ink/70">
        Cumulative mint and burn counters below come from get_protocol_balances. Each mint and burn also emits a NEP-297 ft_mint or ft_burn log. This app does not scan historical logs, so a missing transaction row is not filled in.
      </p>
      <div>
        <h2 className="font-display text-4xl">Contract books</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {balances ? Object.entries(balances).map(([key, value]) => (
            <article className="card p-4" key={key}>
              <p className="text-xs uppercase tracking-wide text-ink/50">{LABELS[key] ?? key.replaceAll("_", " ")}</p>
              <p className="mt-2 break-all font-semibold">{key.endsWith("_ns") || key === "accounting_difference" ? value : paper(value)}</p>
              {LABELS[key] ? <p className="mt-1 text-xs text-ink/45">{key}</p> : null}
            </article>
          )) : <p className="text-ink/60">No balance view yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-4xl">Immutable config</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {config ? Object.entries(config).map(([key, value]) => (
            <div className="card p-4" key={key}>
              <dt className="text-xs uppercase tracking-wide text-ink/50">{key.replaceAll("_", " ")}</dt>
              <dd className="mt-2 break-all font-semibold">{String(value)}</dd>
            </div>
          )) : <p className="text-ink/60">No config view yet.</p>}
        </dl>
      </div>
    </section>
  );
}
