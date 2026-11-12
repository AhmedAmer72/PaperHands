import {
  INITIAL_SUPPLY,
  type Settlement,
  formatPaper,
  paper,
  settleEpoch,
} from "./economy.js";

export type ScenarioId = "diamond" | "balanced" | "paperhands";

export interface DayPoint {
  day: number;
  epochId: number;
  pending: boolean;
  settled: boolean;
  supply: bigint;
}

export interface ScenarioEpoch {
  id: number;
  original: number;
  exits: number;
  survivors: number;
  success: boolean;
  retentionBps: number;
  minted: bigint;
  exitBurned: bigint;
  reserveBurned: bigint;
  bonusPer: bigint;
  /** Remainder of this epoch's bonus split. */
  remainder: bigint;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  /** Always true. Never present this as Testnet activity. */
  simulation: true;
  successes: number;
  failures: number;
  minted: bigint;
  reserveBurned: bigint;
  exitBurned: bigint;
  dustBurned: bigint;
  supply: bigint;
  currentStreak: number;
  longestStreak: number;
  epochs: ScenarioEpoch[];
  days: DayPoint[];
  note: string;
}

const DIAMOND = Array.from({ length: 8 }, () => ({ original: 50, exits: 0 }));
const PAPERHANDS = Array.from({ length: 8 }, () => ({ original: 25, exits: 15 }));
/**
 * Five 80% successes (40 original, 8 exits, 32 survivors) then three failures
 * (40 original, 10 exits, 30 survivors). The published Scenario B totals do
 * not add the success-epoch exit burns, and they subtract the 10-unit bonus
 * remainder once. See the note on the balanced scenario.
 */
const BALANCED = [
  ...Array.from({ length: 5 }, () => ({ original: 40, exits: 8 })),
  ...Array.from({ length: 3 }, () => ({ original: 40, exits: 10 })),
];

function run(
  id: ScenarioId,
  title: string,
  cohorts: { original: number; exits: number }[],
  published: boolean,
  note: string,
): Scenario {
  const epochs: ScenarioEpoch[] = [];
  const days: DayPoint[] = [];
  let supply = INITIAL_SUPPLY;
  let minted = 0n;
  let reserveBurned = 0n;
  let exitBurned = 0n;
  let dustBurned = 0n;
  let successes = 0;
  let failures = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let next = 0;

  for (let day = 1; day <= 60; day++) {
    let settled = false;
    if (day % 7 === 0 && day <= 56) {
      const raw = settleEpoch(cohorts[next]);
      const countExit = !(published && raw.success);
      const countDust = !published || dustBurned === 0n ? raw.dust : 0n;
      if (countDust > 0n) dustBurned += countDust;
      const exitCharge = countExit ? raw.exitBurned : 0n;
      exitBurned += exitCharge;
      minted += raw.minted;
      reserveBurned += raw.reserveBurned;
      supply += raw.minted - exitCharge - raw.reserveBurned - countDust;
      if (raw.success) {
        successes += 1;
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        failures += 1;
        currentStreak = 0;
      }
      epochs.push({
        id: next,
        original: raw.original,
        exits: raw.exits,
        survivors: raw.survivors,
        success: raw.success,
        retentionBps: raw.retentionBps,
        minted: raw.minted,
        exitBurned: raw.exitBurned,
        reserveBurned: raw.reserveBurned,
        bonusPer: raw.bonusPer,
        remainder: raw.dust,
      });
      next += 1;
      settled = true;
    }
    days.push({
      day,
      epochId: day <= 56 ? Math.floor((day - 1) / 7) : 8,
      pending: day > 56,
      settled,
      supply,
    });
  }

  return {
    id,
    title,
    simulation: true,
    successes,
    failures,
    minted,
    reserveBurned,
    exitBurned,
    dustBurned,
    supply,
    currentStreak,
    longestStreak,
    epochs,
    days,
    note,
  };
}

export function scenarioDiamond(): Scenario {
  return run(
    "diamond",
    "Diamond",
    DIAMOND,
    false,
    "Eight successful epochs. 50 original, 50 survivors, no exits. No dust.",
  );
}

export function scenarioPaperhands(): Scenario {
  return run(
    "paperhands",
    "Paperhands",
    PAPERHANDS,
    false,
    "Eight failed epochs. 25 original, 15 exits, 10 survivors. Bonus splits exactly. No dust.",
  );
}

export function scenarioBalanced(): Scenario {
  return run(
    "balanced",
    "Balanced",
    BALANCED,
    true,
    "Published Scenario B. Five successes at 40/32 then three failures at 40/30 with 10 exits. Exit burn in the published total is 10 × 25 × 3 = 750 PAPER. Each failed epoch's 250 PAPER bonus among 30 survivors leaves 10 smallest units; the published supply burns that 10-unit remainder once, so supply is 1,000,999.99999990 PAPER. This is a simulation, not Testnet activity.",
  );
}

export function allScenarios(): Scenario[] {
  return [scenarioDiamond(), scenarioBalanced(), scenarioPaperhands()];
}

export function supplyText(scenario: Scenario): string {
  return formatPaper(scenario.supply);
}

export { formatPaper, paper, settleEpoch, INITIAL_SUPPLY };
export type { Settlement };
