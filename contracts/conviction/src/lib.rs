//! Pure integer rules for PAPERHANDS V3.
//!
//! Diamond Core does not depend on this crate. Sponsor retention is not Core
//! retention, and nothing here mints, burns, or reads chain state.

pub const ONE_PAPER: u128 = 100_000_000;
pub const COMMITMENT: u128 = 1_000 * ONE_PAPER;
pub const MIN_ORIGINALS: u32 = 25;
pub const MIN_RETENTION_BPS: u32 = 8_000;
pub const MAX_PARTICIPANT_CAP: u32 = 200;
pub const BPS: u128 = 10_000;
pub const EARLY_EXIT_PENALTY_BPS: u128 = 500;

pub const SECOND_NS: u64 = 1_000_000_000;
pub const MINUTE_NS: u64 = 60 * SECOND_NS;
pub const HOUR_NS: u64 = 60 * MINUTE_NS;
pub const DAY_NS: u64 = 24 * HOUR_NS;

pub const DEMO_DURATION_NS: u64 = HOUR_NS;
pub const DEMO_ENTRY_NS: u64 = 10 * MINUTE_NS;
pub const PRODUCTION_DURATION_NS: u64 = 7 * DAY_NS;
pub const PRODUCTION_ENTRY_NS: u64 = DAY_NS;
pub const CLAIM_WINDOW_NS: u64 = 30 * DAY_NS;

pub const DEMO_CHALLENGE_NS: u64 = 10 * MINUTE_NS;
pub const PRODUCTION_CHALLENGE_NS: u64 = 3 * DAY_NS;
pub const DEMO_TIMELOCK_NS: u64 = HOUR_NS;
pub const PRODUCTION_TIMELOCK_NS: u64 = DAY_NS;

pub const DEMO: &str = "demo-testnet";
pub const PRODUCTION: &str = "production";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Split {
    pub per: u128,
    pub distributable: u128,
    pub dust: u128,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ExitSplit {
    pub returned: u128,
    pub bonus: u128,
    pub reserve: u128,
}

pub fn is_deployment_kind(kind: &str) -> bool {
    kind == DEMO || kind == PRODUCTION
}

pub fn preset_clocks(kind: &str) -> Option<(u64, u64)> {
    match kind {
        DEMO => Some((DEMO_DURATION_NS, DEMO_ENTRY_NS)),
        PRODUCTION => Some((PRODUCTION_DURATION_NS, PRODUCTION_ENTRY_NS)),
        _ => None,
    }
}

pub fn challenge_window(kind: &str) -> Option<u64> {
    match kind {
        DEMO => Some(DEMO_CHALLENGE_NS),
        PRODUCTION => Some(PRODUCTION_CHALLENGE_NS),
        _ => None,
    }
}

pub fn timelock(kind: &str) -> Option<u64> {
    match kind {
        DEMO => Some(DEMO_TIMELOCK_NS),
        PRODUCTION => Some(PRODUCTION_TIMELOCK_NS),
        _ => None,
    }
}

/// Survivors meet `target_bps` when `survivors * 10_000 >= original * target_bps`.
/// An empty original cohort does not pass. 8,000 bps is exactly 80%.
pub fn retention_met(survivors: u32, original: u32, target_bps: u32) -> bool {
    if original == 0 {
        return false;
    }
    u128::from(survivors).saturating_mul(BPS)
        >= u128::from(original).saturating_mul(u128::from(target_bps))
}

pub fn retention_bps(survivors: u32, original: u32) -> u32 {
    if original == 0 {
        return 0;
    }
    let bps = u128::from(survivors).saturating_mul(BPS) / u128::from(original);
    u32::try_from(bps).unwrap_or(u32::MAX)
}

pub fn equal_split(pool: u128, count: u32) -> Split {
    if count == 0 {
        return Split {
            per: 0,
            distributable: 0,
            dust: pool,
        };
    }
    let per = pool / u128::from(count);
    let distributable = per.saturating_mul(u128::from(count));
    Split {
        per,
        distributable,
        dust: pool.saturating_sub(distributable),
    }
}

/// 5% leaves the participant. Half of that fee is the survivor bonus and half
/// is the SponsorHub protocol reserve. Neither half is a supply burn.
pub fn early_exit(commitment: u128) -> ExitSplit {
    let penalty = commitment.saturating_mul(EARLY_EXIT_PENALTY_BPS) / BPS;
    let bonus = penalty / 2;
    let reserve = penalty.saturating_sub(bonus);
    ExitSplit {
        returned: commitment.saturating_sub(penalty),
        bonus,
        reserve,
    }
}

pub fn thresholds_ok(min_original: u32, target_bps: u32, cap: u32) -> Result<(), &'static str> {
    if min_original < MIN_ORIGINALS {
        return Err("minimum originals cannot be below 25");
    }
    if target_bps < MIN_RETENTION_BPS || target_bps > 10_000 {
        return Err("retention target cannot be below 80% or above 100%");
    }
    if cap < min_original || cap > MAX_PARTICIPANT_CAP {
        return Err("participant cap must sit between the minimum and 200");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eighty_percent_boundary_uses_integers() {
        assert!(retention_met(20, 25, 8_000));
        assert!(!retention_met(19, 25, 8_000));
        assert!(retention_met(160, 200, 8_000));
        assert!(!retention_met(159, 200, 8_000));
        assert!(retention_met(8_000, 10_000, 8_000));
        assert!(!retention_met(7_999, 10_000, 8_000));
        assert_eq!(retention_bps(7_999, 10_000), 7_999);
        assert_eq!(retention_bps(20, 25), 8_000);
        assert!(!retention_met(25, 24, 8_000) || 24 < MIN_ORIGINALS);
        assert!(!retention_met(0, 0, 8_000));
    }

    #[test]
    fn early_exit_is_950_25_25_and_not_a_burn_split() {
        let split = early_exit(COMMITMENT);
        assert_eq!(split.returned, 950 * ONE_PAPER);
        assert_eq!(split.bonus, 25 * ONE_PAPER);
        assert_eq!(split.reserve, 25 * ONE_PAPER);
        assert_eq!(split.returned + split.bonus + split.reserve, COMMITMENT);
    }

    #[test]
    fn dust_has_an_explicit_destination() {
        let even = equal_split(100, 4);
        assert_eq!(even.dust, 0);
        assert_eq!(even.distributable, 100);
        let odd = equal_split(100, 3);
        assert_eq!(odd.per, 33);
        assert_eq!(odd.distributable, 99);
        assert_eq!(odd.dust, 1);
        let empty = equal_split(100, 0);
        assert_eq!(empty.dust, 100);
        assert_eq!(empty.per, 0);
    }

    #[test]
    fn sponsors_cannot_weaken_the_floor() {
        assert!(thresholds_ok(25, 8_000, 25).is_ok());
        assert!(thresholds_ok(25, 9_000, 40).is_ok());
        assert!(thresholds_ok(24, 8_000, 25).is_err());
        assert!(thresholds_ok(25, 7_999, 25).is_err());
        assert!(thresholds_ok(25, 8_000, 201).is_err());
        assert!(thresholds_ok(30, 8_000, 29).is_err());
    }

    #[test]
    fn demo_clock_is_not_the_production_clock() {
        assert_eq!(preset_clocks(DEMO), Some((HOUR_NS, 10 * MINUTE_NS)));
        assert_eq!(preset_clocks(PRODUCTION), Some((7 * DAY_NS, DAY_NS)));
        assert!(preset_clocks("custom").is_none());
        assert_ne!(DEMO_DURATION_NS, PRODUCTION_DURATION_NS);
    }
}
