/** Integer PAPER math. 8 decimals. No floats. This is a simulation, not a chain. */

export const ONE = 100_000_000n;
export const INITIAL_SUPPLY = 1_000_000n * ONE;
export const COMMITMENT = 1_000n * ONE;
export const PENALTY_PART = 25n * ONE;
export const MAX_MINT = 500n * ONE;
export const FAILED_RESERVE_BURN = 250n * ONE;

export function paper(whole: bigint): bigint {
  return whole * ONE;
}

export function formatPaper(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const whole = abs / ONE;
  const frac = (abs % ONE).toString().padStart(8, "0");
  return `${sign}${whole.toString()}.${frac}`;
}

export function min(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}

export function splitPool(pool: bigint, survivors: bigint): { per: bigint; distributable: bigint; dust: bigint } {
  if (survivors <= 0n) return { per: 0n, distributable: 0n, dust: pool };
  const per = pool / survivors;
  const distributable = per * survivors;
  return { per, distributable, dust: pool - distributable };
}

export interface Cohort {
  original: number;
  exits: number;
}

export interface Settlement {
  original: number;
  exits: number;
  survivors: number;
  success: boolean;
  retentionBps: number;
  minted: bigint;
  rewardPer: bigint;
  exitBurned: bigint;
  bonusPool: bigint;
  bonusPer: bigint;
  /** Bonus-pool units that do not divide evenly. The contract burns these. */
  dust: bigint;
  reserveBurned: bigint;
}

export function retentionSucceeded(original: number, survivors: number): boolean {
  return original >= 25 && survivors * 100 >= original * 80;
}

/** Same settlement formulas as the contract. One epoch. */
export function settleEpoch(cohort: Cohort): Settlement {
  if (cohort.exits < 0 || cohort.exits > cohort.original) {
    throw new Error("exits must be between 0 and original");
  }
  const survivors = cohort.original - cohort.exits;
  const success = retentionSucceeded(cohort.original, survivors);
  const eligible = cohort.original >= 25 && survivors > 0;
  const target = eligible ? min(BigInt(survivors) * COMMITMENT * 100n / 10_000n, MAX_MINT) : 0n;
  const reward = splitPool(target, BigInt(survivors));
  const bonusPool = PENALTY_PART * BigInt(cohort.exits);
  const bonus = splitPool(bonusPool, BigInt(survivors));
  return {
    original: cohort.original,
    exits: cohort.exits,
    survivors,
    success,
    retentionBps: cohort.original === 0 ? 0 : Math.floor((survivors * 10_000) / cohort.original),
    minted: reward.distributable,
    rewardPer: reward.per,
    exitBurned: PENALTY_PART * BigInt(cohort.exits),
    bonusPool,
    bonusPer: bonus.per,
    dust: bonus.dust,
    reserveBurned: success ? 0n : FAILED_RESERVE_BURN,
  };
}
