use near_sdk::{env, near, require};

pub(crate) const TOKEN_NAME: &str = "PAPERHANDS";
pub(crate) const TOKEN_SYMBOL: &str = "PAPER";
pub(crate) const DECIMALS: u8 = 8;
pub(crate) const FT_SPEC: &str = "ft-1.0.0";

pub(crate) const ONE_PAPER: u128 = 100_000_000;
pub(crate) const INITIAL_SUPPLY: u128 = 1_000_000 * ONE_PAPER;
pub(crate) const COMMITMENT: u128 = 1_000 * ONE_PAPER;
pub(crate) const FAUCET_RESERVE: u128 = 700_000 * ONE_PAPER;
pub(crate) const BURN_RESERVE: u128 = 300_000 * ONE_PAPER;
pub(crate) const FAUCET_AMOUNT: u128 = 1_000 * ONE_PAPER;
pub(crate) const MAX_MINT_PER_EPOCH: u128 = 500 * ONE_PAPER;
pub(crate) const FAILED_EPOCH_BURN: u128 = 250 * ONE_PAPER;

pub(crate) const MIN_PARTICIPANTS: u32 = 25;
pub(crate) const MAX_PARTICIPANTS: u32 = 500;
pub(crate) const BPS_DENOM: u128 = 10_000;
pub(crate) const PENALTY_BPS: u128 = 500;
pub(crate) const PENALTY_BURN_SHARE_BPS: u128 = 5_000;
pub(crate) const PENALTY_SURVIVOR_SHARE_BPS: u128 = 5_000;
pub(crate) const MINT_RATE_BPS: u128 = 100;

pub(crate) const SECOND_NS: u64 = 1_000_000_000;
pub(crate) const MINUTE_NS: u64 = 60 * SECOND_NS;
pub(crate) const HOUR_NS: u64 = 60 * MINUTE_NS;
pub(crate) const DAY_NS: u64 = 24 * HOUR_NS;
pub(crate) const PRODUCTION_EPOCH_NS: u64 = 7 * DAY_NS;
pub(crate) const PRODUCTION_ENTRY_NS: u64 = DAY_NS;
pub(crate) const DEMO_EPOCH_NS: u64 = HOUR_NS;
pub(crate) const DEMO_ENTRY_NS: u64 = 10 * MINUTE_NS;
pub(crate) const REWARD_WINDOW_NS: u64 = 30 * DAY_NS;

pub(crate) const DEPLOYMENT_PRODUCTION: &str = "production";
pub(crate) const DEPLOYMENT_DEMO: &str = "demo-testnet";

/// Immutable parameters copied into state at init. Views read this struct.
/// Nothing in the contract writes it again.
#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct EconomicConfig {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub spec: String,
    pub initial_supply: u128,
    pub commitment: u128,
    pub epoch_duration_ns: u64,
    pub entry_window_ns: u64,
    pub min_participants: u32,
    pub max_participants: u32,
    pub retention_numerator: u32,
    pub retention_denominator: u32,
    pub early_exit_penalty_bps: u32,
    pub penalty_burn_share_bps: u32,
    pub penalty_survivor_share_bps: u32,
    pub mint_rate_bps: u32,
    pub max_mint_per_epoch: u128,
    pub failed_epoch_reserve_burn: u128,
    pub reward_claim_window_ns: u64,
    pub faucet_enabled: bool,
    pub faucet_amount: u128,
    pub faucet_cap: u128,
    pub deployment_kind: String,
    pub genesis_timestamp_ns: u64,
}

pub(crate) fn build_config(
    epoch_duration_ns: u64,
    entry_window_ns: u64,
    faucet_enabled: bool,
    deployment_kind: &str,
    genesis_timestamp_ns: u64,
) -> EconomicConfig {
    require!(epoch_duration_ns > 0, "epoch duration must be positive");
    require!(entry_window_ns > 0, "entry window must be positive");
    require!(
        entry_window_ns < epoch_duration_ns,
        "entry window must be shorter than the epoch",
    );
    match deployment_kind {
        DEPLOYMENT_PRODUCTION => {
            let message =
                "production must use a 7 day epoch, a 24 hour entry window, and a disabled faucet";
            require!(
                epoch_duration_ns == PRODUCTION_EPOCH_NS
                    && entry_window_ns == PRODUCTION_ENTRY_NS
                    && !faucet_enabled,
                message,
            );
        }
        DEPLOYMENT_DEMO => {
            let message = "demo-testnet must use a 1 hour epoch, a 10 minute entry window, and an enabled faucet";
            require!(
                epoch_duration_ns == DEMO_EPOCH_NS
                    && entry_window_ns == DEMO_ENTRY_NS
                    && faucet_enabled,
                message,
            );
        }
        _ => env::panic_str("deployment_kind must be production or demo-testnet"),
    }

    EconomicConfig {
        name: TOKEN_NAME.to_string(),
        symbol: TOKEN_SYMBOL.to_string(),
        decimals: DECIMALS,
        spec: FT_SPEC.to_string(),
        initial_supply: INITIAL_SUPPLY,
        commitment: COMMITMENT,
        epoch_duration_ns,
        entry_window_ns,
        min_participants: MIN_PARTICIPANTS,
        max_participants: MAX_PARTICIPANTS,
        retention_numerator: 80,
        retention_denominator: 100,
        early_exit_penalty_bps: u32::try_from(PENALTY_BPS).expect("penalty bps"),
        penalty_burn_share_bps: u32::try_from(PENALTY_BURN_SHARE_BPS).expect("burn share"),
        penalty_survivor_share_bps: u32::try_from(PENALTY_SURVIVOR_SHARE_BPS)
            .expect("survivor share"),
        mint_rate_bps: u32::try_from(MINT_RATE_BPS).expect("mint rate"),
        max_mint_per_epoch: MAX_MINT_PER_EPOCH,
        failed_epoch_reserve_burn: FAILED_EPOCH_BURN,
        reward_claim_window_ns: REWARD_WINDOW_NS,
        faucet_enabled,
        faucet_amount: FAUCET_AMOUNT,
        faucet_cap: FAUCET_RESERVE,
        deployment_kind: deployment_kind.to_string(),
        genesis_timestamp_ns,
    }
}
