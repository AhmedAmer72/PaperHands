"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { MISSION_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type MissionView, listMissions } from "@/lib/v3";

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listMissions(MISSION_CONTRACT_ID)
      .then(setMissions)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Missions"
        lede="A mission pays for accepted work from its own escrow. Completing one does not change a Diamond or Sponsor streak."
        title="Work with a funded budget."
      />
      {error ? <p className="card p-5 text-sm">MissionHub did not answer. {error}</p> : null}
      {!loaded && !error ? <p className="card p-5 text-sm">Reading missions.</p> : null}
      {loaded && !error && missions.length === 0 ? <p className="card p-5 text-sm">No missions are stored yet.</p> : null}
      <div className="grid gap-4">
        {missions.map((item) => (
          <Link className="card block p-5" href={`/missions/${item.mission_id}`} key={item.mission_id}>
            <p className="text-xs font-semibold text-forest">{item.demo_clock ? "DEMO CLOCK" : "PRODUCTION CLOCK"} · {item.state}</p>
            <h2 className="mt-2 font-display text-3xl">{item.objective}</h2>
            <p className="mt-2 text-sm">{paper(item.payout_each)} each · up to {item.max_acceptances} accepted · {item.assigned} assigned</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
