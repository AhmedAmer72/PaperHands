import Link from "next/link";
import { PageHead } from "@/components/PageChrome";

const STEPS = [
  ["01", "Connect wallet", "A Testnet wallet opens only when you ask it to. The app never marks a transaction successful on its own.", "/commitment", "Open commitment"],
  ["02", "Commit 1,000 PAPER", "The contract transfers exactly 1,000 PAPER and stores the commitment. The first join in an epoch writes 274 bytes; later joins write 67.", "/commitment", "Sign the join"],
  ["03", "Stay diamond", "After the entry window, leaving returns 950 PAPER. 25 is burned and 25 is assigned to whoever stays.", "/commitment", "See the exit rule"],
  ["04", "Retention target", "Success needs at least 25 original accounts and survivors × 100 ≥ original × 80. Eighty percent passes exactly.", "/paperhands-index", "Read the index"],
  ["05", "Rewards are calculated", "The mint is 1% of active locked principal, capped at 500 PAPER, split equally. Unassigned remainder is not minted.", "/economy", "Open the economy"],
  ["06", "Claim principal and rewards", "Principal never expires. Rewards last 30 days after that epoch is finalized, then a sweep can burn what was not claimed.", "/paperhands-index", "Open an epoch"],
];

export default function HowPage() {
  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="How it works"
        lede="Six actions. The contract is the one that moves PAPER. Each step links to the page that can actually do it."
        title="A path, not a pile of cards."
      />
      <ol className="grid gap-4">
        {STEPS.map(([n, title, copy, href, action]) => (
          <li className="card grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center" key={n}>
            <span className="num">{n}</span>
            <div>
              <h2 className="font-display text-4xl">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/75">{copy}</p>
            </div>
            <Link className="btn btn-pink" href={href}>{action}</Link>
          </li>
        ))}
      </ol>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[2rem] bg-forest p-6 text-cream">
          <h2 className="font-display text-4xl">Paper hands pay</h2>
          <p className="mt-3 text-cream/80">Leave early and the 5% penalty is real. Half of it burns. Half rewards the accounts that stay.</p>
        </article>
        <article className="rounded-[2rem] bg-pink p-6">
          <h2 className="font-display text-4xl">Diamond hands earn</h2>
          <p className="mt-3">Stay, and after settlement you can claim the original principal plus whatever share the epoch assigned.</p>
          <Link className="btn btn-cream mt-4" href="/commitment">Join this epoch</Link>
        </article>
      </div>
    </section>
  );
}
