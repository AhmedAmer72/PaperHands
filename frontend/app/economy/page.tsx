"use client";

import { useEffect, useState } from "react";
import { type CurrentEpoch, type ProtocolBalances, contractReady, view } from "@/lib/chain";
import { deploymentBanner, durationLabel, paper } from "@/lib/format";

type Config = Record<string, string | number | boolean>;

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
    <section>
      <h1 className="text-4xl">Token economy</h1>
      <p className="mt-3 max-w-3xl text-ink/70">{epoch ? deploymentBanner(epoch.deployment_kind, epoch.faucet_enabled) : error}</p>
      <p className="mt-2 text-sm text-ink/60">Theoretical maximum emission is 500 PAPER × 52 epochs = 26,000 PAPER in a year of seven-day epochs, before burns. That is not a guaranteed APY.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {balances ? Object.entries(balances).map(([key, value]) => (
          <article className="rounded-lg bg-white p-3" key={key}>
            <p className="text-xs uppercase text-ink/50">{key.replaceAll("_", " ")}</p>
            <p className="mt-1 break-all">{key.endsWith("_ns") || key === "accounting_difference" ? value : paper(value)}</p>
          </article>
        )) : null}
      </div>
      <h2 className="mt-8 text-2xl">Immutable config</h2>
      <p className="mt-2 text-sm">Epoch length on this deployment: {durationLabel(epoch?.epoch_duration_ns, epoch?.deployment_kind)}.</p>
      <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        {config ? Object.entries(config).map(([key, value]) => (
          <div className="rounded-lg border border-ink/10 p-3" key={key}>
            <dt className="text-ink/50">{key}</dt>
            <dd className="break-all">{String(value)}</dd>
          </div>
        )) : null}
      </dl>
    </section>
  );
}
