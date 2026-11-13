"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { Field, FormError } from "@/components/Field";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { CONTRACT_ID, ONE_YOCTO, TREASURY_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type ProposalView, type TreasuryBooks, listProposals, treasuryBooks, wholeToRaw } from "@/lib/v3";

const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export default function TreasuryPage() {
  const [books, setBooks] = useState<TreasuryBooks | null>(null);
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donation, setDonation] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [milestone, setMilestone] = useState("");
  const [evidence, setEvidence] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);
  const wallet = useWallet();

  async function reload() {
    setBooks(await treasuryBooks(TREASURY_CONTRACT_ID));
    setProposals(await listProposals(TREASURY_CONTRACT_ID));
    setLoaded(true);
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : String(caught));
      setLoaded(true);
    });
  }, []);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Community treasury"
        lede="This balance is donations. It is not participant principal and it is not a sponsor reward pool. Two approvers and a timelock are required before the executor can release funds."
        title="Spend only what was approved."
      />
      <p className="text-sm text-ink/70">Contract {TREASURY_CONTRACT_ID}. Donations are a PAPER transfer whose message is exactly {`{"action":"donate"}`}.</p>
      {error ? <p className="card p-5 text-sm">Treasury did not answer. {error}</p> : null}
      {books ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>{books.demo_clock ? "Demo timelock: 1 hour." : "Production timelock: 24 hours."}</p>
          <p>Assets {paper(books.assets)} · available {paper(books.available)} · reserved {paper(books.reserved)}</p>
          <p>Accounting difference {books.accounting_difference}</p>
        </article>
      ) : null}
      {!loaded && !error ? <p aria-busy="true" className="card p-5 text-sm">Reading treasury proposals…</p> : null}
      {loaded && !error && proposals.length === 0 ? <p className="card p-5 text-sm">No proposals yet. A donation stays here until two approvers and the timelock agree to spend it.</p> : null}
      <div className="grid gap-4">
        {proposals.map((item) => (
          <Link className="card block p-5" href={`/treasury/${item.proposal_id}`} key={item.proposal_id}>
            <h2 className="font-display text-3xl">{item.milestone}</h2>
            <p className="mt-2 text-sm">{paper(item.amount)} to {item.beneficiary} · {item.approvals.length} approvals · {item.executed ? "executed" : "open"}</p>
          </Link>
        ))}
      </div>
      <form className="card grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); askDonation(); }}>
        <h2 className="font-display text-3xl">Donate PAPER</h2>
        <Field hint="Whole PAPER. This is a donation, not principal." inputMode="numeric" label="Whole PAPER" name="donation" value={donation} onChange={setDonation} />
        <button className="btn btn-pink w-fit" type="submit">Review donation</button>
      </form>
      <form className="card grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); askProposal(); }}>
        <h2 className="font-display text-3xl">Propose a spend</h2>
        <Field autoComplete="username" label="Beneficiary account" name="beneficiary" value={beneficiary} onChange={setBeneficiary} />
        <Field hint="Whole PAPER. This signature does not send it." inputMode="numeric" label="Amount" name="proposal-amount" value={amount} onChange={setAmount} />
        <Field label="Milestone" name="milestone" value={milestone} onChange={setMilestone} />
        <Field label="Public evidence reference" name="evidence" value={evidence} onChange={setEvidence} />
        <button className="btn btn-green w-fit" type="submit">Review proposal</button>
      </form>
      <FormError message={formError} />
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );

  function askDonation() {
    const raw = wholeToRaw(donation);
    if (!raw) {
      setFormError("Enter a positive whole number of PAPER.");
      return;
    }
    setFormError(null);
    setConfirming({
      title: "Donate to the treasury",
      contract: CONTRACT_ID,
      method: "ft_transfer_call",
      token: `PAPER · ${CONTRACT_ID} · 8 decimals`,
      amount: paper(raw),
      role: "donation, not principal and not a sponsor reward",
      warning: `The PAPER receiver is ${TREASURY_CONTRACT_ID}. The message is {"action":"donate"}. This does not join a campaign.`,
      refundPath: "A rejected message returns the PAPER. Two approvers and the timelock are still required before anyone can spend it.",
    });
  }

  function askProposal() {
    const raw = wholeToRaw(amount);
    const beneficiaryId = beneficiary.trim().toLowerCase();
    if (!raw || !milestone.trim() || !evidence.trim() || !ACCOUNT.test(beneficiaryId) || milestone.includes("@") || evidence.includes("@")) {
      setFormError("Use a beneficiary account, a positive PAPER amount, and public milestone text without an email address.");
      return;
    }
    setFormError(null);
    setConfirming({
      title: "Create a treasury proposal",
      contract: TREASURY_CONTRACT_ID,
      method: "create_proposal",
      token: "No PAPER moves on this signature.",
      amount: paper(raw),
      role: "proposal, not a transfer",
      subjectLabel: "Proposal",
      warning: "Creating a proposal does not reserve or send funds. Two different approvers and the timelock still have to pass, and the executor cannot be an approver.",
      refundPath: "Until both approvals reserve the amount, the donation stays available.",
    });
  }

  async function sign() {
    if (!confirming) return;
    const donating = confirming.method === "ft_transfer_call";
    const raw = wholeToRaw(donating ? donation : amount);
    if (!raw) return;
    const result = await wallet.send(
      confirming.method,
      donating
        ? { receiver_id: TREASURY_CONTRACT_ID, amount: raw, memo: null, msg: JSON.stringify({ action: "donate" }) }
        : { beneficiary: beneficiary.trim().toLowerCase(), amount: raw, milestone, evidence },
      ONE_YOCTO,
      donating ? CONTRACT_ID : TREASURY_CONTRACT_ID,
    );
    setReport(result);
    setConfirming(null);
    if (result.ok) {
      try { await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    }
  }
}
