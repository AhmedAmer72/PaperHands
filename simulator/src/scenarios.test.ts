import { describe, expect, it } from "vitest";
import { INITIAL_SUPPLY, formatPaper, paper, settleEpoch, splitPool } from "./economy.js";
import { scenarioBalanced, scenarioDiamond, scenarioPaperhands } from "./scenarios.js";

describe("contract formulas", () => {
  it("burns the 10-unit remainder of 250 PAPER among 30 survivors", () => {
    const split = splitPool(paper(250n), 30n);
    expect(split.dust).toBe(10n);
    expect(split.per * 30n + split.dust).toBe(paper(250n));
    const epoch = settleEpoch({ original: 40, exits: 10 });
    expect(epoch.survivors).toBe(30);
    expect(epoch.success).toBe(false);
    expect(epoch.minted).toBe(paper(300n));
    expect(epoch.reserveBurned).toBe(paper(250n));
    expect(epoch.exitBurned).toBe(paper(250n));
    expect(epoch.dust).toBe(10n);
    expect(epoch.bonusPer).toBe(833_333_333n);
  });

  it("keeps an 80 percent cohort and drops 79 percent", () => {
    expect(settleEpoch({ original: 25, exits: 0 }).success).toBe(true);
    expect(settleEpoch({ original: 25, exits: 5 }).success).toBe(true);
    expect(settleEpoch({ original: 25, exits: 6 }).success).toBe(false);
    expect(settleEpoch({ original: 40, exits: 8 }).success).toBe(true);
    expect(settleEpoch({ original: 40, exits: 8 }).minted).toBe(paper(320n));
    expect(settleEpoch({ original: 32, exits: 7 }).success).toBe(false);
    expect(settleEpoch({ original: 0, exits: 0 }).minted).toBe(0n);
    expect(settleEpoch({ original: 0, exits: 0 }).reserveBurned).toBe(paper(250n));
  });
});

describe("60-day scenarios", () => {
  it("scenario A diamond matches the table and leaves epoch 9 pending", () => {
    const scenario = scenarioDiamond();
    expect(scenario.simulation).toBe(true);
    expect(scenario.successes).toBe(8);
    expect(scenario.failures).toBe(0);
    expect(scenario.minted).toBe(paper(4_000n));
    expect(scenario.reserveBurned).toBe(0n);
    expect(scenario.exitBurned).toBe(0n);
    expect(scenario.dustBurned).toBe(0n);
    expect(scenario.supply).toBe(paper(1_004_000n));
    expect(scenario.currentStreak).toBe(8);
    expect(scenario.longestStreak).toBe(8);
    expect(scenario.epochs).toHaveLength(8);
    expect(scenario.days).toHaveLength(60);
    expect(scenario.days.filter((day) => day.pending)).toHaveLength(4);
    expect(scenario.days[59].epochId).toBe(8);
    expect(scenario.days[59].supply).toBe(scenario.supply);
  });

  it("scenario C paperhands matches the table with an exact 37.5 bonus", () => {
    const scenario = scenarioPaperhands();
    expect(scenario.successes).toBe(0);
    expect(scenario.failures).toBe(8);
    expect(scenario.minted).toBe(paper(800n));
    expect(scenario.reserveBurned).toBe(paper(2_000n));
    expect(scenario.exitBurned).toBe(paper(3_000n));
    expect(scenario.dustBurned).toBe(0n);
    expect(scenario.supply).toBe(paper(995_800n));
    expect(scenario.currentStreak).toBe(0);
    expect(scenario.longestStreak).toBe(0);
    expect(scenario.epochs[0].bonusPer).toBe(paper(375n) / 10n);
    expect(scenario.epochs[0].bonusPer * 10n).toBe(paper(375n));
  });

  it("scenario B burns the 10-unit dust and ends at 1,000,999.99999990 PAPER", () => {
    const scenario = scenarioBalanced();
    expect(scenario.successes).toBe(5);
    expect(scenario.failures).toBe(3);
    expect(scenario.minted).toBe(paper(2_500n));
    expect(scenario.reserveBurned).toBe(paper(750n));
    expect(scenario.exitBurned).toBe(paper(750n));
    expect(scenario.dustBurned).toBe(10n);
    expect(scenario.supply).toBe(INITIAL_SUPPLY + paper(2_500n) - paper(750n) - paper(750n) - 10n);
    expect(formatPaper(scenario.supply)).toBe("1000999.99999990");
    expect(scenario.currentStreak).toBe(0);
    expect(scenario.longestStreak).toBe(5);
    expect(scenario.epochs.slice(0, 5).every((epoch) => epoch.success && epoch.survivors === 32)).toBe(true);
    expect(scenario.epochs.slice(5).every((epoch) => !epoch.success && epoch.remainder === 10n)).toBe(true);
    expect(scenario.days.filter((day) => day.pending)).toHaveLength(4);
    expect(scenario.note.toLowerCase()).toContain("simulation");
  });
});
