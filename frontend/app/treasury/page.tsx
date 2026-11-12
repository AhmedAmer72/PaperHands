"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { TREASURY_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type ProposalView, type TreasuryBooks, listProposals, treasuryBooks } from "@/lib/v3";

export default function TreasuryPage() {
  const [books, setBooks] = useState<TreasuryBooks | null>(null);
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setBooks(await treasuryBooks(TREASURY_CONTRACT_ID));
        setProposals(await listProposals(TREASURY_CONTRACT_ID));
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
        eyebrow="Community treasury"
        lede="This balance is donations. It is not participant principal and it is not a sponsor reward pool. Two approvers and a timelock are required before the executor can release funds."
        title="Spend only what was approved."
      />
      {error ? <p className="card p-5 text-sm">Treasury did not answer. {error}</p> : null}
      {books ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>{books.demo_clock ? "Demo timelock: 1 hour." : "Production timelock: 24 hours."}</p>
          <p>Assets {paper(books.assets)} · available {paper(books.available)} · reserved {paper(books.reserved)}</p>
          <p>Accounting difference {books.accounting_difference}</p>
        </article>
      ) : null}
      {!loaded && !error ? <p className="card p-5 text-sm">Reading treasury proposals.</p> : null}
      {loaded && !error && proposals.length === 0 ? <p className="card p-5 text-sm">No proposals are stored yet.</p> : null}
      <div className="grid gap-4">
        {proposals.map((item) => (
          <Link className="card block p-5" href={`/treasury/${item.proposal_id}`} key={item.proposal_id}>
            <h2 className="font-display text-3xl">{item.milestone}</h2>
            <p className="mt-2 text-sm">{paper(item.amount)} to {item.beneficiary} · {item.approvals.length} approvals · {item.executed ? "executed" : "open"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
