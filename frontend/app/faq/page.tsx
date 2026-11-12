import Link from "next/link";
import { PageHead } from "@/components/PageChrome";

const QUESTIONS = [
  ["What is PAPERHANDS?", "A NEAR fungible token and one commitment protocol. You lock 1,000 PAPER for an epoch. Staying makes you eligible to claim that principal plus an equal share of the mint and of the early-exit bonuses."],
  ["What is a Diamond Commitment?", "A voluntary lock for the current epoch. Cancelling during the entry window returns all 1,000. After that, the early-exit rule applies. You cannot rejoin the same epoch."],
  ["Can I leave early?", "Yes, after the entry window and before the epoch ends. You receive 950 PAPER. The other 50 is split between an immediate burn and the survivor bonus."],
  ["What happens to the early-exit penalty?", "Half is burned immediately. Half is assigned in equal shares to the accounts still active when the epoch is finalized. Dust that does not divide evenly is burned."],
  ["Can I lose my original principal?", "An early exit returns 950, so the 50 PAPER penalty does not come back. A survivor claims the full 1,000 after finalization. Principal claims do not expire."],
  ["What happens if the epoch fails?", "The streak resets and up to 250 PAPER burns from the reserve. Survivors can still claim principal and any mint or bonus the settlement assigned. An empty epoch fails."],
  ["How are rewards calculated?", "If at least 25 accounts entered and at least one stayed, the mint is 1% of the survivors' locked principal, capped at 500 PAPER, divided equally. Retention can fail and the epoch can still mint."],
  ["Is PAPERHANDS Sybil-proof?", "No. The faucet pays 1,000 PAPER once per account from the reserve. One person can use many Testnet accounts. get_faucet_status.sybil_resistant is false."],
  ["What is the difference between the Testnet demo and production?", "Same formulas. Production is a 7 day epoch, a 24 hour entry window, and the faucet off. Demo-testnet is 1 hour, 10 minutes, and the faucet on. A demo deployment is not a seven-day production epoch."],
  ["Does a sponsor campaign count as my Diamond commitment?", "No. SponsorHub keeps its own cohort. The confirm screen says so before you sign. The profile page lists the two records separately."],
  ["Is the sponsor early-exit fee burned?", "No. 950 PAPER comes back, 25 is booked for survivors, and 25 is booked to the SponsorHub protocol reserve. The Diamond Core burn rule stays on the Diamond contract only."],
];

export default function FaqPage() {
  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Questions"
        lede="The short answers. The full rule text lives on its own page, and the buttons that move PAPER live on the commitment page."
        title="Before you lock it"
      />
      <div className="card px-6 md:px-8">
        {QUESTIONS.map(([q, a]) => (
          <details className="faq" key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-pink" href="/commitment">Go to commitment</Link>
        <Link className="btn btn-green" href="/rules">Read the full rules</Link>
      </div>
    </section>
  );
}
