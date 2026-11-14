import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Connect",
    body: "Connect a NEAR testnet account and register storage. The commitment page does both.",
    href: "/commitment",
    cta: "Open commitment",
  },
  {
    n: "02",
    title: "Claim, then lock",
    body: "Claim the faucet once. Then lock 1,000 PAPER into the open epoch.",
    href: "/commitment",
    cta: "Lock PAPER",
  },
  {
    n: "03",
    title: "Stay, or leave early",
    body: "Stay through the epoch, or exit early and receive 950 PAPER. The other 50 is the penalty.",
    href: "/commitment",
    cta: "See your position",
  },
  {
    n: "04",
    title: "Finalize and claim",
    body: "After the epoch closes, open it from the index. Finalize, then claim principal and rewards.",
    href: "/paperhands-index",
    cta: "Open epochs",
  },
];

export default function GetStartedPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <header>
        <h1 className="display-md">Get started</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/75">
          Four steps. Each one lands on a page that sends the transaction.
        </p>
      </header>
      <ol className="path mt-12">
        {STEPS.map((step) => (
          <li key={step.n}>
            <span>{step.n}</span>
            <div>
              <h2 className="font-display text-3xl leading-none">{step.title}</h2>
              <p className="mt-3 max-w-xl leading-relaxed text-ink/75">{step.body}</p>
              <Link className="btn btn-green mt-4" href={step.href}>{step.cta}</Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
