import Link from "next/link";
import { PageHead } from "@/components/PageChrome";

const CHAPTERS = [
  ["01", "The token", "PAPER is a NEP-141 token with 8 decimals. The contract starts with 1,000,000 PAPER. A commitment locks exactly 1,000 PAPER. Sending PAPER to someone else is not taxed."],
  ["02", "The clock", "An epoch begins at the init block time and then every epoch length after that. Production uses 7 days and a 24-hour entry window. A demo deployment uses 1 hour and a 10-minute entry window. The demo is not a seven-day production epoch. The contract stores which one it is, and nothing in the contract can switch it later."],
  ["03", "Join, cancel, exit", "Join during the entry window if you are registered, hold 1,000 PAPER, and the cohort is under 500. Cancel during that same window and the full 1,000 comes back. You cannot rejoin that epoch. After the entry window, the cohort size freezes. Leaving then is an early exit: you receive 950, 25 is burned, and 25 is reserved for the people who stay. You cannot exit once the epoch has ended."],
  ["04", "Success and failure", "The epoch succeeds when at least 25 accounts were still in at the close of entry and at least 80% of them are still in at the end. 80% passes. Anything below fails. Anyone can finalize the next finished epoch, once, in order. Empty epochs fail too."],
  ["05", "Mint, bonus, claims", "Survivors split a mint of 1% of the PAPER still locked, capped at 500 PAPER for the whole epoch. Unassigned rounding is not minted. The same equal split applies to the early-exit bonus. Leftover bonus units are burned. A failed epoch can still mint if 25 people joined and someone stayed. It also burns up to 250 PAPER from the burn reserve and resets the current streak. The longest streak does not fall. Principal can be claimed after finalization and does not expire. Reward claims last 30 days, then anyone may burn the unclaimed mint and bonus. Principal is never swept."],
  ["06", "Faucet and keys", "The demo faucet can pay 1,000 PAPER once per account from a 700,000 PAPER reserve. It does not mint. It is not Sybil-proof: one person can open many Testnet accounts. The burn reserve is only for failed epochs. There is no admin setter and no upgrade method in this contract. The account that holds the code can still replace it until its keys are removed. Removing those keys is not part of this build, so the code is not fully immutable yet."],
  ["07", "Griefing", "Griefing is possible. Exits can push retention under 80% and reset the streak. Survivors of that epoch still receive the graded mint and the exit bonus. Multiple wallets can join. Do not read a streak as proof of distinct people."],
];

export default function RulesPage() {
  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Protocol rules"
        lede="The same rules the contract enforces. This page does not add a second set of numbers."
        title="Weak hands. Strong rules."
      />
      <ol className="grid gap-4">
        {CHAPTERS.map(([n, title, copy]) => (
          <li className="card flex gap-4 p-5 md:p-6" key={n}>
            <span className="num">{n}</span>
            <div>
              <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/80">{copy}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-pink" href="/commitment">Use the commitment page</Link>
        <Link className="btn btn-green" href="/faq">Shorter answers</Link>
      </div>
    </section>
  );
}
