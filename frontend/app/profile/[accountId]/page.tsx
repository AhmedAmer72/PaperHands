"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { type CurrentEpoch, type UserEpochState, view } from "@/lib/chain";
import { MISSION_CONTRACT_ID, SPONSOR_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type CampaignView, type MissionView, type ParticipantView, listCampaigns, listMissions, participant } from "@/lib/v3";

type Row = { campaign: CampaignView; position: ParticipantView };

export default function ProfilePage() {
  const params = useParams<{ accountId: string }>();
  const accountId = decodeURIComponent(params.accountId);
  const [epoch, setEpoch] = useState<CurrentEpoch | null>(null);
  const [core, setCore] = useState<UserEpochState | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [missions, setMissions] = useState<MissionView[]>([]);
  const [sponsorLoaded, setSponsorLoaded] = useState(false);
  const [missionsLoaded, setMissionsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const current = await view<CurrentEpoch>("get_current_epoch");
        setEpoch(current);
        setCore(await view<UserEpochState>("get_user_epoch_state", { epoch_id: current.epoch_id, account_id: accountId }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
      try {
        const campaigns = await listCampaigns(SPONSOR_CONTRACT_ID);
        const found = (await Promise.all(campaigns.map(async (item) => {
          const position = await participant(SPONSOR_CONTRACT_ID, item.campaign_id, accountId);
          return position ? { campaign: item, position } : null;
        }))).filter((row): row is Row => row !== null);
        setRows(found);
      } catch (caught) {
        setError((current) => current || (caught instanceof Error ? caught.message : String(caught)));
      } finally {
        setSponsorLoaded(true);
      }
      try {
        const all = await listMissions(MISSION_CONTRACT_ID);
        setMissions(all.filter((item) => item.sponsor_id === accountId || item.reviewer_id === accountId || item.escalation_id === accountId));
      } catch (caught) {
        setError((current) => current || (caught instanceof Error ? caught.message : String(caught)));
      } finally {
        setMissionsLoaded(true);
      }
    })();
  }, [accountId]);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Account profile"
        lede="This page is a read model of public transactions. A named account is not a verified person. Core, Sponsor, and Mission activity stay in separate sections."
        title={accountId}
      />
      {error ? <p className="card p-5 text-sm">{error}</p> : null}
      <article className="card p-5">
        <h2 className="font-display text-3xl">Diamond Core</h2>
        <p className="mt-3 text-sm">Epoch {epoch?.epoch_id ?? "—"} · status {core ? core.status ?? "no commitment in this epoch" : "no commitment read"} · claimable principal {paper(core?.claimable_principal)}</p>
        <p className="mt-2 text-sm text-ink/70">Core streak is the protocol streak on the Diamond contract. It is not a personal score and it is not combined with sponsor campaigns.</p>
      </article>
      <article className="card p-5">
        <h2 className="font-display text-3xl">Sponsor campaigns</h2>
        {!sponsorLoaded ? <p className="mt-3 text-sm">Reading sponsor positions.</p> : null}
        {sponsorLoaded && rows.length === 0 ? <p className="mt-3 text-sm">No sponsor position was found for this account in the listed campaigns.</p> : null}
        <ul className="mt-3 space-y-3 text-sm">
          {rows.map((row) => (
            <li key={row.campaign.campaign_id}>
              <Link href={`/sponsors/${row.campaign.campaign_id}`}>{row.campaign.name}</Link>: {row.position.status}. This campaign does not change the Core streak.
            </li>
          ))}
        </ul>
      </article>
      <article className="card p-5">
        <h2 className="font-display text-3xl">Missions</h2>
        {!missionsLoaded ? <p className="mt-3 text-sm">Reading MissionHub.</p> : null}
        {missionsLoaded && missions.length === 0 ? <p className="mt-3 text-sm">No mission on {MISSION_CONTRACT_ID} names this account as sponsor, reviewer, or escalation.</p> : null}
        <ul className="mt-3 space-y-3 text-sm">
          {missions.map((item) => (
            <li key={item.mission_id}>
              <Link href={`/missions/${item.mission_id}`}>{item.objective}</Link>: {item.state}. This mission is not added to either streak.
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink/70">Mission outcomes stay on the mission page. A completed mission is not a financial reputation score.</p>
      </article>
    </section>
  );
}
