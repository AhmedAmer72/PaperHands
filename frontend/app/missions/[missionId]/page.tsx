"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { Field, FormError } from "@/components/Field";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { CONTRACT_ID, MISSION_CONTRACT_ID, ONE_YOCTO } from "@/lib/config";
import { clockLabel, paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type MissionBooks, type MissionView, type SubmissionView, mission, missionBooks, missionBudget, submission } from "@/lib/v3";

export default function MissionPage() {
  const params = useParams<{ missionId: string }>();
  const id = params.missionId;
  const wallet = useWallet();
  const [item, setItem] = useState<MissionView | null>(null);
  const [books, setBooks] = useState<MissionBooks | null>(null);
  const [found, setFound] = useState<SubmissionView | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [reason, setReason] = useState("accepted");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload() {
    setItem(await mission(MISSION_CONTRACT_ID, id));
    setBooks(await missionBooks(MISSION_CONTRACT_ID, id));
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [id]);

  const budget = item ? missionBudget(item.payout_each, item.max_acceptances) : null;

  async function readSubmission() {
    if (!/^\d+$/.test(submissionId)) {
      setError("Enter the submission id returned by MissionHub.");
      return;
    }
    setError(null);
    try {
      setFound(await submission(MISSION_CONTRACT_ID, submissionId));
    } catch (caught) {
      setFound(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function sign() {
    if (!confirming || !item || !budget) return;
    const funding = confirming.method === "ft_transfer_call";
    const review = confirming.method === "review_submission" || confirming.method === "escalate_submission";
    const args: Record<string, unknown> = funding
      ? { receiver_id: MISSION_CONTRACT_ID, amount: budget, memo: null, msg: JSON.stringify({ action: "fund_mission", mission_id: Number(id) }) }
      : review
        ? { submission_id: submissionId, accepted: reason !== "rejected", reason }
        : confirming.method === "submit_evidence"
          ? { mission_id: id, evidence }
          : confirming.method === "open_mission" || confirming.method === "refund_unspent"
            ? { mission_id: id }
            : { submission_id: submissionId };
    const result = await wallet.send(confirming.method, args, ONE_YOCTO, funding ? CONTRACT_ID : MISSION_CONTRACT_ID);
    setReport(result);
    setConfirming(null);
    if (result.ok) {
      try { await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    }
  }

  function ask(method: string, role: string, amount: string, warning: string) {
    if ((method === "submit_evidence" && (!evidence.trim() || evidence.includes("@"))) || (method !== "submit_evidence" && method !== "ft_transfer_call" && method !== "open_mission" && method !== "refund_unspent" && !/^\d+$/.test(submissionId))) {
      setError(method === "submit_evidence" ? "Evidence needs a link, commit, or short text, and it cannot contain an email address." : "Enter the submission id from MissionHub.");
      return;
    }
    if ((method === "review_submission" || method === "escalate_submission") && (!reason.trim() || reason.includes("@"))) {
      setError("A review needs a reason code, without an email address.");
      return;
    }
    setError(null);
    setConfirming({
      title: "Mission action",
      contract: method === "ft_transfer_call" ? CONTRACT_ID : MISSION_CONTRACT_ID,
      method,
      token: `PAPER · ${CONTRACT_ID} · 8 decimals`,
      amount,
      role,
      campaignId: id,
      subjectLabel: "Mission",
      warning,
      refundPath: "Unspent budget returns to the sponsor after the deadline, once every submission is settled. The reviewer cannot withdraw it.",
    });
  }

  return (
    <section className="space-y-8">
      <PageHead eyebrow="Mission" lede={item ? `${clockLabel(item.demo_clock)}. ${item.scope}` : "Mission terms come from MissionHub."} title={item?.objective || `Mission ${id}`} />
      {item ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>State {item.state} · payout {paper(item.payout_each)} · cap {item.max_acceptances}</p>
          <p>Full budget {paper(budget)} · this is the only amount MissionHub will accept as funding</p>
          <p>Contract {MISSION_CONTRACT_ID} · id {item.mission_id}</p>
          <p>Sponsor {item.sponsor_id}</p>
          <p>Reviewer {item.reviewer_id}</p>
          <p>Escalation {item.escalation_id}</p>
          <p>Acceptance criteria: {item.criteria}</p>
          <p>A completed mission does not change a Diamond streak or a sponsor streak.</p>
        </article>
      ) : error ? null : <p aria-busy="true" className="text-sm">Reading this mission…</p>}
      {books ? (
        <article className="card p-5 text-sm">
          <h2 className="font-display text-3xl">Escrow</h2>
          <p className="mt-2">Assets {paper(books.assets)} · budget {paper(books.budget)} · assigned {paper(books.assigned)}</p>
          <p>Refund recorded {paper(books.refund)} · pending {paper(books.pending)} · difference {books.accounting_difference}</p>
        </article>
      ) : null}
      <FormError message={error} />
      {item && budget ? (
        <div className="grid gap-4">
          <fieldset className="card grid gap-3 p-5">
            <legend className="px-1 text-sm font-semibold text-forest">Sponsor</legend>
            <p className="text-sm text-ink/70">Only the sponsor can fund, open, or refund. The reviewer cannot take this budget.</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-pink" onClick={() => ask("ft_transfer_call", "mission escrow deposit", paper(budget), `This sends the full budget to ${MISSION_CONTRACT_ID}. It does not join a sponsor campaign or a Diamond epoch.`)} type="button">Fund the full budget</button>
              <button className="btn btn-green" onClick={() => ask("open_mission", "no token amount", "0 PAPER", "Only the sponsor can open a funded mission. The clock is the deployment preset.")} type="button">Open mission</button>
              <button className="btn btn-cream" onClick={() => ask("refund_unspent", "unspent mission budget", paper(books?.budget), "Only the sponsor can refund, and only after the deadline when nothing is still open.")} type="button">Refund unspent</button>
            </div>
          </fieldset>
          <fieldset className="card grid gap-3 p-5">
            <legend className="px-1 text-sm font-semibold text-forest">Your work</legend>
            <Field hint="Public. Leave out email addresses." label="Evidence link, commit, or short text" name="evidence" value={evidence} onChange={setEvidence} />
            <button className="btn btn-pink w-fit" onClick={() => ask("submit_evidence", "no token leaves your wallet", "0 PAPER", "Evidence is public. Do not include an email address or other personal data.")} type="button">Submit evidence</button>
          </fieldset>
          <fieldset className="card grid gap-3 p-5">
            <legend className="px-1 text-sm font-semibold text-forest">A submission</legend>
            <Field hint="The id MissionHub returned." inputMode="numeric" label="Submission id" name="submission" value={submissionId} onChange={setSubmissionId} />
            <Field hint="Use rejected to decline." label="Review reason code" name="reason" value={reason} onChange={setReason} />
            <button className="btn btn-cream w-fit" onClick={() => void readSubmission()} type="button">Read submission</button>
            {found ? <p className="text-sm">Submission {found.submission_id} is {found.status} for {found.account_id}. Payout {paper(found.payout)}. Reason {found.reason || "none"}.</p> : null}
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-green" onClick={() => ask("review_submission", "review, not a payout", "0 PAPER", "The reviewer cannot refund this budget. Use reason code rejected to decline.")} type="button">Review</button>
              <button className="btn btn-green" onClick={() => ask("challenge_submission", "challenge, not a payout", "0 PAPER", "A challenge asks the escalation account to decide. It does not move PAPER.")} type="button">Challenge</button>
              <button className="btn btn-green" onClick={() => ask("escalate_submission", "escalation, not a payout", "0 PAPER", "The escalation account is not the first reviewer.")} type="button">Escalate</button>
              <button className="btn btn-cream" onClick={() => ask("settle_submission", "escrow assignment", paper(item.payout_each), "Settlement assigns this mission's escrow. It does not mint PAPER.")} type="button">Settle</button>
              <button className="btn btn-cream" onClick={() => ask("claim_payout", "mission reward", paper(found?.payout || item.payout_each), "The payout comes only from this mission's escrow.")} type="button">Claim payout</button>
            </div>
          </fieldset>
        </div>
      ) : null}
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}
