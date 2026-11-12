//! PAPERHANDS Diamond Commitment.
//!
//! One NEP-141 token and one protocol. The contract, not a backend, decides
//! emissions, burns, rewards, streaks, and claims. Economic parameters are
//! copied into state at `new` and have no setter.

mod accounting;
mod bonuses;
mod commitment;
mod config;
mod epoch;
mod events;
mod rewards;
mod settlement;
mod storage;
mod token;
mod treasury;
mod views;

pub use commitment::CommitmentStatus;
pub use config::EconomicConfig;
pub use views::{
    CommitmentView, CurrentEpoch, EconomicConfigView, EpochDetail, EpochStats, FaucetStatus,
    ProtocolBalances, UserEpochState,
};

use near_contract_standards::fungible_token::FungibleToken;
use near_contract_standards::fungible_token::events::FtMint;
use near_sdk::json_types::{U64, U128};
use near_sdk::store::{LookupMap, LookupSet};
use near_sdk::{AccountId, PanicOnDefault, env, near, require};

use crate::commitment::UserCommitment;
use crate::config::{BURN_RESERVE, FAUCET_RESERVE, INITIAL_SUPPLY};
use crate::epoch::EpochState;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) token: FungibleToken,
    pub(crate) config: EconomicConfig,
    pub(crate) epochs: LookupMap<u64, EpochState>,
    pub(crate) commitments: LookupMap<(u64, AccountId), UserCommitment>,
    pub(crate) faucet_claims: LookupSet<AccountId>,
    pub(crate) burn_reserve: u128,
    pub(crate) faucet_reserve: u128,
    pub(crate) locked_principal: u128,
    pub(crate) unclaimed_mint_rewards: u128,
    pub(crate) unclaimed_exit_bonuses: u128,
    pub(crate) next_epoch_to_finalize: u64,
    pub(crate) current_streak: u64,
    pub(crate) longest_streak: u64,
    pub(crate) total_graded_minted: u128,
    pub(crate) total_exit_burned: u128,
    pub(crate) total_reserve_burned: u128,
    pub(crate) total_dust_burned: u128,
    pub(crate) total_swept_burned: u128,
}

#[near]
impl Contract {
    /// Initialize a production or demo-testnet deployment.
    ///
    /// Production is 7 days / 24 hour entry / faucet off. Demo-testnet is
    /// 1 hour / 10 minute entry / faucet on. Every other economic number is
    /// fixed. There is no upgrade method and no parameter setter.
    #[init]
    pub fn new(
        epoch_duration_ns: U64,
        entry_window_ns: U64,
        faucet_enabled: bool,
        deployment_kind: String,
    ) -> Self {
        require!(
            FAUCET_RESERVE.checked_add(BURN_RESERVE) == Some(INITIAL_SUPPLY),
            "faucet and burn reserves must sum to the initial supply",
        );
        let config = config::build_config(
            epoch_duration_ns.0,
            entry_window_ns.0,
            faucet_enabled,
            &deployment_kind,
            env::block_timestamp(),
        );
        let mut contract = Self {
            token: FungibleToken::new(b"t"),
            config,
            epochs: LookupMap::new(b"e"),
            commitments: LookupMap::new(b"c"),
            faucet_claims: LookupSet::new(b"f"),
            burn_reserve: 0,
            faucet_reserve: 0,
            locked_principal: 0,
            unclaimed_mint_rewards: 0,
            unclaimed_exit_bonuses: 0,
            next_epoch_to_finalize: 0,
            current_streak: 0,
            longest_streak: 0,
            total_graded_minted: 0,
            total_exit_burned: 0,
            total_reserve_burned: 0,
            total_dust_burned: 0,
            total_swept_burned: 0,
        };
        let id = env::current_account_id();
        contract.token.internal_register_account(&id);
        contract.token.internal_deposit(&id, INITIAL_SUPPLY);
        FtMint {
            owner_id: &id,
            amount: U128(INITIAL_SUPPLY),
            memo: Some("initial supply"),
        }
        .emit();
        contract.burn_reserve = BURN_RESERVE;
        contract.faucet_reserve = FAUCET_RESERVE;
        contract.assert_accounting();
        contract
    }
}

#[cfg(test)]
mod tests;
