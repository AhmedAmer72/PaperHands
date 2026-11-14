import Link from "next/link";
import { PageHead } from "@/components/PageChrome";

const PLACES = [
  ["/get-started", "Get started", "The four steps, each one opening the page that sends the transaction."],
  ["/commitment", "Commit", "Connect, register storage, claim the faucet, and lock 1,000 PAPER."],
  ["/paperhands-index", "Epochs", "Who stayed and who left, read from the contract."],
  ["/sponsors", "Sponsors", "A separate 1,000 PAPER lock. It does not count as an epoch commitment."],
  ["/missions", "Missions", "Paid work from a mission escrow. It does not change an epoch streak."],
  ["/treasury", "Treasury", "Donations. Two approvers and a timelock before anyone can spend them."],
] as const;

export default function DocsPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <PageHead
        eyebrow="Docs"
        lede="PaperHands is a commitment game on NEAR testnet. A join locks 1,000 PAPER in the contract for one epoch."
        title="The lock, the clock, and the three roles."
      />

      <div className="mt-12 space-y-12">
        <section>
          <h2 className="font-display text-3xl">What a join locks</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
            One amount: 1,000 PAPER. It sits in the contract until you claim it or you leave. The page does not invent a balance. If the contract has not answered, the number stays blank.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl">The clock</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
            An epoch has an entry window, then a hold. Both durations come from the contract. Join is open only during entry. Early exit opens after entry closes and only before the epoch ends.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl">Stay, cancel, or leave</h2>
          <ul className="mt-4 grid gap-3">
            <li className="card p-5">
              <p className="font-semibold">Cancel during entry</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">Returns all 1,000 PAPER. You cannot rejoin that epoch.</p>
            </li>
            <li className="card p-5">
              <p className="font-semibold">Exit early</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">Returns 1,000 PAPER minus the contract penalty. At 500 bps that is 950 PAPER. The rest is the penalty. It is not a reward.</p>
            </li>
            <li className="card p-5">
              <p className="font-semibold">Stay</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">After the epoch closes, open it from the index. Finalize, then claim principal and any rewards that epoch minted.</p>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-3xl">Before the lock</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
            Connect a testnet account. Register storage. Claim the faucet once. Then lock. The commitment page sends each of those transactions. A sponsor campaign, a mission, and a treasury vote are different contracts. None of them replaces the epoch lock.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl">Where each action lives</h2>
          <ul className="mt-4 grid gap-3">
            {PLACES.map(([href, title, body]) => (
              <li key={href}>
                <Link className="card block p-5 transition-transform duration-200 hover:-translate-y-0.5" href={href}>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
