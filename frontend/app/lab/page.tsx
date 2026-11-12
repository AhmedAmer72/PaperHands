import { allScenarios, formatPaper } from "paperhands-simulator";

export default function LabPage() {
  const scenarios = allScenarios();
  const widest = scenarios.reduce((max, scenario) => (scenario.supply > max ? scenario.supply : max), 0n);
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.25em] text-orange">Simulation</p>
      <h1 className="mt-2 text-4xl">Tokenomics lab</h1>
      <p className="mt-3 max-w-3xl text-paper/80">
        These 60-day runs use the published scenario totals. They are not Testnet transactions, not prices, and not a yield guarantee.
        The ninth epoch stays pending. Scenario B&apos;s published supply is 1,000,999.99999990 PAPER because the 10-unit bonus remainder is burned.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <article className="rounded-xl border border-violet/40 bg-ink p-4" key={scenario.id}>
            <p className="text-xs text-orange">SIMULATION</p>
            <h2 className="mt-1 text-2xl">{scenario.title}</h2>
            <p className="mt-2 text-sm text-paper/70">{scenario.note}</p>
            <dl className="mt-4 space-y-1 text-sm">
              <Row term="Successes / failures" value={`${scenario.successes} / ${scenario.failures}`} />
              <Row term="Mint" value={formatPaper(scenario.minted)} />
              <Row term="Reserve burn" value={formatPaper(scenario.reserveBurned)} />
              <Row term="Exit burn" value={formatPaper(scenario.exitBurned)} />
              <Row term="Dust burned" value={scenario.dustBurned.toString()} />
              <Row term="Supply" value={formatPaper(scenario.supply)} />
              <Row term="Streak now / longest" value={`${scenario.currentStreak} / ${scenario.longestStreak}`} />
            </dl>
            <div className="mt-4 h-2 rounded bg-charcoal">
              <div className="h-2 rounded bg-cyan" style={{ width: `${Number((scenario.supply * 100n) / widest)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-paper/50">{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
