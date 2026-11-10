import { allScenarios, formatPaper } from "paperhands-simulator";
import { PageHead } from "@/components/PageChrome";

export default function LabPage() {
  const scenarios = allScenarios();
  const widest = scenarios.reduce((max, scenario) => (scenario.supply > max ? scenario.supply : max), 0n);
  const low = scenarios.reduce((min, scenario) => {
    const floor = scenario.days.reduce((inner, point) => (point.supply < inner ? point.supply : inner), scenario.supply);
    return floor < min ? floor : min;
  }, widest);
  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Simulation"
        lede="These 60-day runs use the published scenario totals. They are not Testnet transactions, not prices, and not a yield guarantee. The ninth epoch stays pending. Scenario B's published supply is 1,000,999.99999990 PAPER because the 10-unit bonus remainder is burned."
        title="Three published paths"
      />
      <div className="grid gap-4">
        {scenarios.map((scenario) => {
          const span = widest - low || 1n;
          return (
            <article className="card p-5 md:p-6" key={scenario.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange">Simulation · not Testnet</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-5xl">{scenario.title}</h2>
                <p className="font-display text-3xl">{formatPaper(scenario.supply)} PAPER</p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/75">{scenario.note}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Cell term="Successes / failures" value={`${scenario.successes} / ${scenario.failures}`} />
                <Cell term="Mint" value={formatPaper(scenario.minted)} />
                <Cell term="Reserve burn" value={formatPaper(scenario.reserveBurned)} />
                <Cell term="Exit burn" value={formatPaper(scenario.exitBurned)} />
                <Cell term="Dust burned" value={scenario.dustBurned.toString()} />
                <Cell term="Streak now / longest" value={`${scenario.currentStreak} / ${scenario.longestStreak}`} />
              </dl>
              <div className="mt-5 flex h-24 items-end gap-0.5" aria-hidden>
                {scenario.days.filter((point) => point.day % 2 === 0).map((point) => {
                  const height = Number(((point.supply - low) * 100n) / span);
                  return (
                    <span
                      className={`block flex-1 rounded-t ${point.pending ? "bg-pink/70" : point.settled ? "bg-forest" : "bg-forest/25"}`}
                      key={point.day}
                      style={{ height: `${Math.max(height, 8)}%` }}
                      title={`Day ${point.day}: ${formatPaper(point.supply)} PAPER${point.pending ? " pending" : ""}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink/50">Even days only, so the chart stays readable. Pink bars are the pending ninth epoch. Forest bars are days a settlement ran. This chart is the simulator, not chain history.</p>
              <ol className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                {scenario.epochs.map((epoch) => (
                  <li className="rounded-2xl bg-cream px-3 py-2" key={epoch.id}>
                    Epoch {epoch.id}: {epoch.survivors}/{epoch.original} stayed · {epoch.success ? "success" : "failure"} · mint {formatPaper(epoch.minted)}
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Cell({ term, value }: { term: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream px-3 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink/50">{term}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
