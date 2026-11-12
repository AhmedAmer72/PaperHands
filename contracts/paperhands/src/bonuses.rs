use crate::config::{
    BPS_DENOM, COMMITMENT, FAILED_EPOCH_BURN, MAX_MINT_PER_EPOCH, MIN_PARTICIPANTS, MINT_RATE_BPS,
    PENALTY_BPS, PENALTY_BURN_SHARE_BPS,
};

pub(crate) struct ExitSplit {
    pub returned: u128,
    pub burned: u128,
    pub bonus: u128,
}

/// 5% penalty on the locked commitment. Half of that penalty is burned and
/// half is the survivor bonus. For 1,000 PAPER this is 950 / 25 / 25.
pub(crate) fn early_exit_split(commitment: u128) -> ExitSplit {
    let penalty = commitment
        .checked_mul(PENALTY_BPS)
        .expect("penalty overflow")
        / BPS_DENOM;
    let burned = penalty
        .checked_mul(PENALTY_BURN_SHARE_BPS)
        .expect("burn share overflow")
        / BPS_DENOM;
    let bonus = penalty.checked_sub(burned).expect("bonus underflow");
    let returned = commitment.checked_sub(penalty).expect("return underflow");
    ExitSplit {
        returned,
        burned,
        bonus,
    }
}

pub(crate) struct BonusSplit {
    pub per_survivor: u128,
    pub distributable: u128,
    pub dust: u128,
}

/// Equal integer shares. Dust is `pool - per * survivors` and must be burned.
/// A pool with zero survivors is entirely dust.
pub(crate) fn split_bonus(pool: u128, survivors: u32) -> BonusSplit {
    if survivors == 0 {
        return BonusSplit {
            per_survivor: 0,
            distributable: 0,
            dust: pool,
        };
    }
    let per = pool / u128::from(survivors);
    let distributable = per
        .checked_mul(u128::from(survivors))
        .expect("bonus distributable");
    BonusSplit {
        per_survivor: per,
        distributable,
        dust: pool - distributable,
    }
}

pub(crate) struct Emission {
    pub per_survivor: u128,
    pub minted: u128,
}

/// Graded mint of 1% of surviving locked principal, capped at 500 PAPER.
/// Only `per * survivors` is minted. Ineligible epochs mint nothing.
pub(crate) fn graded_emission(original: u32, survivors: u32) -> Emission {
    if original < MIN_PARTICIPANTS || survivors == 0 {
        return Emission {
            per_survivor: 0,
            minted: 0,
        };
    }
    let locked = u128::from(survivors)
        .checked_mul(COMMITMENT)
        .expect("locked principal");
    let uncapped = locked.checked_mul(MINT_RATE_BPS).expect("mint rate") / BPS_DENOM;
    let target = uncapped.min(MAX_MINT_PER_EPOCH);
    let per = target / u128::from(survivors);
    let minted = per.checked_mul(u128::from(survivors)).expect("minted");
    Emission {
        per_survivor: per,
        minted,
    }
}

/// `survivors * 100 >= original * 80`, and the cohort must have at least 25
/// original participants. 80% passes. 79.99% fails. Empty cohorts fail.
pub(crate) fn retention_succeeded(original: u32, survivors: u32) -> bool {
    if original < MIN_PARTICIPANTS {
        return false;
    }
    u128::from(survivors).checked_mul(100).expect("retention")
        >= u128::from(original).checked_mul(80).expect("retention")
}

pub(crate) fn retention_bps(original: u32, survivors: u32) -> u32 {
    if original == 0 {
        return 0;
    }
    let bps = u128::from(survivors).saturating_mul(10_000) / u128::from(original);
    u32::try_from(bps).unwrap_or(u32::MAX)
}

pub(crate) fn failed_reserve_burn(burn_reserve: u128, success: bool) -> u128 {
    if success {
        0
    } else {
        burn_reserve.min(FAILED_EPOCH_BURN)
    }
}
