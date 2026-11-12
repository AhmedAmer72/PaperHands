"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { SPONSOR_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type CampaignView, type SponsorConfig, listCampaigns, sponsorConfig } from "@/lib/v3";

export default function SponsorsPage() {
  const [config, setConfig] = useState<SponsorConfig | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setConfig(await sponsorConfig(SPONSOR_CONTRACT_ID));
        setCampaigns(await listCampaigns(SPONSOR_CONTRACT_ID));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Sponsored epochs"
        lede="A sponsor locks a reward pool. Participants lock a separate 1,000 PAPER. That lock is not a Diamond Core commitment, and the two streaks are not added together."
        title="Fund a campaign. Keep the rules fixed."
      />
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-pink" href="/sponsors/create">Create a campaign</Link>
        <Link className="btn btn-green" href="/rules">Read the sponsor rules</Link>
      </div>
      <article className="card p-5">
        <h2 className="font-display text-3xl">NEAR Intents</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/80">
          Route discovery is not connected. A quote, even a signed one from another network, is not a join. SponsorHub records a join only after 1,000 PAPER arrives from the PAPER contract.
        </p>
        <button className="btn btn-cream mt-4" disabled type="button">Quotes unavailable</button>
      </article>
      {config ? (
        <p className="text-sm text-ink/70">Contract {SPONSOR_CONTRACT_ID}.{" "}
          {config.demo_clock
            ? "Demo clock: 1 hour, 10 minute entry. This is not a 7 day production campaign."
            : "Production clock: 7 days, 24 hour entry."}
          {" "}Protocol fee {config.protocol_fee_bps} bps. Early exit is not a burn.
        </p>
      ) : null}
      {error ? <p className="card p-5 text-sm">SponsorHub did not answer. {error}</p> : null}
      {!loaded && !error ? <p className="card p-5 text-sm">Reading campaigns from SponsorHub.</p> : null}
      {loaded && !error && campaigns.length === 0 ? <p className="card p-5 text-sm">No campaigns are stored yet.</p> : null}
      <div className="grid gap-4">
        {campaigns.map((item) => (
          <Link className="card block p-5" href={`/sponsors/${item.campaign_id}`} key={item.campaign_id}>
            <p className="text-xs font-semibold text-forest">{item.demo_clock ? "DEMO CLOCK" : "PRODUCTION CLOCK"} · {item.state}</p>
            <h2 className="mt-2 font-display text-3xl">{item.name}</h2>
            <p className="mt-2 text-sm text-ink/75">{item.description}</p>
            <p className="mt-3 text-sm">Reward pool {paper(item.reward_amount)} · {item.active_participants} active · cap {item.participant_cap}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
