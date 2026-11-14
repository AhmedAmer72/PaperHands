"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { Field, FormError } from "@/components/Field";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { MISSION_CONTRACT_ID, ONE_YOCTO } from "@/lib/config";
import { clockLabel, paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type MissionView, listMissions, wholeToRaw } from "@/lib/v3";

const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export default function MissionsPage() {
  const wallet = useWallet();
  const [missions, setMissions] = useState<MissionView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState("");
  const [criteria, setCriteria] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [escalation, setEscalation] = useState("");
  const [payout, setPayout] = useState("");
  const [maximum, setMaximum] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload() {
    setMissions(await listMissions(MISSION_CONTRACT_ID));
    setLoaded(true);
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : String(caught));
      setLoaded(true);
    });
  }, []);

  function ask() {
    const raw = wholeToRaw(payout);
    const max = Number(maximum);
    const reviewerId = reviewer.trim().toLowerCase();
    const escalationId = escalation.trim().toLowerCase();
    if (!objective.trim() || !scope.trim() || !criteria.trim() || !raw || !Number.isInteger(max) || max < 1 || max > 50) {
      setFormError("Use an objective, scope, criteria, a positive whole-PAPER payout, and 1 to 50 acceptances.");
      return;
    }
    if (objective.includes("@") || scope.includes("@") || criteria.includes("@")) {
      setFormError("Leave personal data, including email addresses, out of the mission text.");
      return;
    }
    if (!ACCOUNT.test(reviewerId) || !ACCOUNT.test(escalationId) || reviewerId === escalationId || reviewerId === wallet.accountId) {
      setFormError("The reviewer and the escalation account must be two different accounts, and the reviewer cannot be you.");
      return;
    }
    setFormError(null);
    setConfirming({
      title: "Create the mission draft",
      contract: MISSION_CONTRACT_ID,
      method: "create_mission",
      token: "No PAPER moves on this signature.",
      amount: `${payout} PAPER each, up to ${max}, still unfunded`,
      role: "mission terms, not a payout",
      subjectLabel: "Mission",
      warning: "Funding is a second signature. The budget is payout times the acceptance cap, and it stays in this mission's escrow.",
      refundPath: "Unspent budget can return to the sponsor after the deadline, once every submission is settled. The reviewer cannot take it.",
    });
  }

  async function sign() {
    const raw = wholeToRaw(payout);
    if (!raw || !confirming) return;
    const result = await wallet.send(
      "create_mission",
      {
        objective,
        scope,
        criteria,
        reviewer_id: reviewer.trim().toLowerCase(),
        escalation_id: escalation.trim().toLowerCase(),
        payout_each: raw,
        max_acceptances: Number(maximum),
      },
      ONE_YOCTO,
      MISSION_CONTRACT_ID,
    );
    setReport(result);
    setConfirming(null);
    if (result.ok) {
      try { await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    }
  }

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Missions"
        lede="A mission pays for accepted work from its own escrow on MissionHub. Completing one does not change a Diamond or Sponsor streak."
        title="Work with a funded budget."
      />
      <p className="text-sm text-ink/70">Contract {MISSION_CONTRACT_ID}. This balance is not SponsorHub and it is not Diamond Core.</p>
      {error ? <p className="card p-5 text-sm" role="alert">MissionHub did not answer. {error}</p> : null}
      {!loaded && !error ? <p aria-busy="true" className="card p-5 text-sm">Reading missions…</p> : null}
      {loaded && !error && missions.length === 0 ? <p className="card p-5 text-sm">No missions yet. Draft one below. Funding is a second signature.</p> : null}
      <div className="grid gap-4">
        {missions.map((item) => (
          <Link className="card block p-5" href={`/missions/${item.mission_id}`} key={item.mission_id}>
            <p className="text-xs font-semibold text-forest">{clockLabel(item.demo_clock)} · {item.state}</p>
            <h2 className="mt-2 font-display text-3xl">{item.objective}</h2>
            <p className="mt-2 text-sm">{paper(item.payout_each)} each · up to {item.max_acceptances} accepted · {item.assigned} assigned</p>
          </Link>
        ))}
      </div>
      <form className="card grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); ask(); }}>
        <h2 className="font-display text-3xl">Create a draft</h2>
        <Field label="Objective" name="objective" value={objective} onChange={setObjective} />
        <Field label="Scope" name="scope" value={scope} onChange={setScope} />
        <Field label="Acceptance criteria" name="criteria" value={criteria} onChange={setCriteria} />
        <Field autoComplete="username" hint="A different account from you." label="Reviewer account" name="reviewer" value={reviewer} onChange={setReviewer} />
        <Field autoComplete="username" hint="Different from the reviewer." label="Escalation account" name="escalation" value={escalation} onChange={setEscalation} />
        <Field hint="Whole PAPER for each accepted submission." inputMode="numeric" label="Payout each" name="payout" value={payout} onChange={setPayout} />
        <Field hint="1 to 50. The budget is payout times this number." inputMode="numeric" label="Maximum acceptances" name="maximum" value={maximum} onChange={setMaximum} />
        <FormError message={formError} />
        <button className="btn btn-pink w-fit" type="submit">Review draft</button>
      </form>
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}

