"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { MISSION_CONTRACT_ID, ONE_YOCTO } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type MissionView, mission } from "@/lib/v3";

export default function MissionPage() {
  const params = useParams<{ missionId: string }>();
  const id = params.missionId;
  const wallet = useWallet();
  const [item, setItem] = useState<MissionView | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  useEffect(() => {
    void mission(MISSION_CONTRACT_ID, id).then(setItem).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [id]);

  async function sign() {
    if (!confirming) return;
    const args: Record<string, unknown> = confirming.method === "submit_evidence"
      ? { mission_id: id, evidence }
      : confirming.method === "review_submission" || confirming.method === "escalate_submission"
        ? { submission_id: submissionId, accepted: true, reason: "accepted" }
        : { submission_id: submissionId || id, mission_id: id };
    const result = await wallet.send(confirming.method, args, ONE_YOCTO, MISSION_CONTRACT_ID);
    setReport(result);
    setConfirming(null);
  }

  function ask(method: string, role: string) {
    setConfirming({
      title: "Mission action",
      contract: MISSION_CONTRACT_ID,
      method,
      token: "PAPER · 8 decimals",
      amount: paper(item?.payout_each),
      role,
      campaignId: id,
      warning: "Do not put an email address or other personal data in the evidence field. The reviewer cannot withdraw this budget.",
      refundPath: "Unspent budget returns to the sponsor after the deadline, once every submission is settled.",
    });
  }

  return (
    <section className="space-y-8">
      <PageHead eyebrow="Mission" lede={item?.scope || "Mission terms come from the contract."} title={item?.objective || `Mission ${id}`} />
      {error ? <p className="card p-5 text-sm">{error}</p> : null}
      {item ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>State {item.state} · payout {paper(item.payout_each)} · cap {item.max_acceptances}</p>
          <p>Sponsor {item.sponsor_id}</p>
          <p>Reviewer {item.reviewer_id}</p>
          <p>Escalation {item.escalation_id}</p>
          <p>Acceptance criteria: {item.criteria}</p>
        </article>
      ) : null}
      <label className="grid gap-1 text-sm">
        Evidence link, commit, or short text
        <input className="rounded-2xl border border-ink/10 bg-white px-3 py-2" value={evidence} onChange={(event) => setEvidence(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        Submission id for review, challenge, settle, or claim
        <input className="rounded-2xl border border-ink/10 bg-white px-3 py-2" value={submissionId} onChange={(event) => setSubmissionId(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-pink" onClick={() => ask("submit_evidence", "no token leaves your wallet")} type="button">Submit evidence</button>
        <button className="btn btn-green" onClick={() => ask("review_submission", "review, not a payout")} type="button">Accept as reviewer</button>
        <button className="btn btn-green" onClick={() => ask("challenge_submission", "challenge, not a payout")} type="button">Challenge</button>
        <button className="btn btn-cream" onClick={() => ask("settle_submission", "escrow assignment")} type="button">Settle</button>
        <button className="btn btn-cream" onClick={() => ask("claim_payout", "mission reward")} type="button">Claim payout</button>
      </div>
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}
