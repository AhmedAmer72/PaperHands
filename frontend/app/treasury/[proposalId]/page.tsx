"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { ONE_YOCTO, TREASURY_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type ProposalView, proposal } from "@/lib/v3";

export default function ProposalPage() {
  const params = useParams<{ proposalId: string }>();
  const id = params.proposalId;
  const wallet = useWallet();
  const [item, setItem] = useState<ProposalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  useEffect(() => {
    void proposal(TREASURY_CONTRACT_ID, id).then(setItem).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [id]);

  async function sign() {
    if (!confirming) return;
    const result = await wallet.send(confirming.method, { proposal_id: id }, ONE_YOCTO, TREASURY_CONTRACT_ID);
    setReport(result);
    setConfirming(null);
  }

  return (
    <section className="space-y-8">
      <PageHead eyebrow="Treasury proposal" lede={item?.evidence || "Evidence is a public reference, not a private file."} title={item?.milestone || `Proposal ${id}`} />
      {error ? <p className="card p-5 text-sm">{error}</p> : null}
      {item ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>Amount {paper(item.amount)} · beneficiary {item.beneficiary}</p>
          <p>Approvals {item.approvals.join(", ") || "none yet"}</p>
          <p>{item.executed ? "Executed." : item.pending ? "Transfer in flight." : "Waiting for two approvals and the timelock."}</p>
        </article>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-green" onClick={() => setConfirming({ title: "Approve proposal", contract: TREASURY_CONTRACT_ID, method: "approve_proposal", token: "No token moves", amount: paper(item?.amount), role: "approval, not a transfer", campaignId: id, subjectLabel: "Proposal", refundPath: "An approval does not send funds. The executor still waits for the timelock.", warning: "One account cannot both approve and execute." })} type="button">Approve</button>
        <button className="btn btn-pink" onClick={() => setConfirming({ title: "Execute proposal", contract: TREASURY_CONTRACT_ID, method: "execute_proposal", token: "PAPER · 8 decimals", amount: paper(item?.amount), role: "treasury grant", campaignId: id, subjectLabel: "Proposal", refundPath: "A failed transfer leaves the reserved budget in place.", warning: "Only the executor can send this, and only after two different approvers and the timelock." })} type="button">Execute</button>
      </div>
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}
