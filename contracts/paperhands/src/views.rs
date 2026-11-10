use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, near};

use crate::bonuses::{retention_bps, retention_succeeded};
use crate::commitment::{CommitmentStatus, effective_status, is_survivor_record};
use crate::config::COMMITMENT;
use crate::{Contract, ContractExt};

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct EconomicConfigView {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub spec: String,
    pub initial_supply: U128,
    pub commitment: U128,
    pub epoch_duration_ns: U64,
    pub entry_window_ns: U64,
    pub min_participants: u32,
    pub max_participants: u32,
    pub retention_numerator: u32,
    pub retention_denominator: u32,
    pub early_exit_penalty_bps: u32,
    pub penalty_burn_share_bps: u32,
    pub penalty_survivor_share_bps: u32,
    pub mint_rate_bps: u32,
    pub max_mint_per_epoch: U128,
    pub failed_epoch_reserve_burn: U128,
    pub reward_claim_window_ns: U64,
    pub principal_claim_expires: bool,
    pub faucet_enabled: bool,
    pub faucet_amount: U128,
    pub faucet_cap: U128,
    pub deployment_kind: String,
    pub genesis_timestamp_ns: U64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct CurrentEpoch {
    pub deployment_kind: String,
    pub epoch_duration_ns: U64,
    pub entry_window_ns: U64,
    pub faucet_enabled: bool,
    pub epoch_id: U64,
    pub start_ns: U64,
    pub entry_end_ns: U64,
    pub end_ns: U64,
    pub now_ns: U64,
    pub phase: String,
    pub next_epoch_to_finalize: U64,
    pub current_streak: u64,
    pub longest_streak: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct EpochStats {
    pub epoch_id: U64,
    pub phase: String,
    pub original_participants: Option<u32>,
    pub active_participants: u32,
    pub early_exits: u32,
    pub locked_principal: U128,
    pub survivor_bonus_pool: U128,
    pub retention_bps: u32,
    pub projected_success: Option<bool>,
    pub finalized: bool,
    pub success: Option<bool>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct EpochDetail {
    pub epoch_id: U64,
    pub start_ns: U64,
    pub entry_end_ns: U64,
    pub end_ns: U64,
    pub phase: String,
    pub original_participants: Option<u32>,
    pub active_participants: u32,
    pub early_exits: u32,
    pub locked_principal: U128,
    pub survivor_bonus_pool: U128,
    pub exit_burned: U128,
    pub finalized: bool,
    pub success: Option<bool>,
    pub retention_bps: Option<u32>,
    pub projected_success: Option<bool>,
    pub minted: U128,
    pub reward_per_survivor: U128,
    pub bonus_per_survivor: U128,
    pub reserve_burned: U128,
    pub dust_burned: U128,
    pub finalized_at_ns: Option<U64>,
    pub reward_claim_deadline_ns: Option<U64>,
    pub unclaimed_mint_remaining: U128,
    pub unclaimed_bonus_remaining: U128,
    pub rewards_swept: bool,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct CommitmentView {
    pub status: CommitmentStatus,
    pub stored_status: CommitmentStatus,
    pub rewards_claimed: bool,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct UserEpochState {
    pub epoch_id: U64,
    pub account_id: AccountId,
    pub status: Option<CommitmentStatus>,
    pub stored_status: Option<CommitmentStatus>,
    pub rewards_claimed: bool,
    pub claimable_principal: U128,
    pub claimable_mint: U128,
    pub claimable_bonus: U128,
    pub principal_claim_open: bool,
    pub rewards_claim_open: bool,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct ProtocolBalances {
    pub contract_token_balance: U128,
    pub burn_reserve: U128,
    pub faucet_reserve: U128,
    pub locked_principal: U128,
    pub unclaimed_mint_rewards: U128,
    pub unclaimed_exit_bonuses: U128,
    pub accounting_difference: String,
    pub total_supply: U128,
    pub total_graded_minted: U128,
    pub total_exit_burned: U128,
    pub total_reserve_burned: U128,
    pub total_dust_burned: U128,
    pub total_swept_burned: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct FaucetStatus {
    pub enabled: bool,
    pub amount: U128,
    pub cap: U128,
    pub remaining: U128,
    pub claimed: Option<bool>,
    /// Always false. One person can claim with many Testnet accounts.
    pub sybil_resistant: bool,
}

fn u128v(value: u128) -> U128 {
    U128(value)
}

fn u64v(value: u64) -> U64 {
    U64(value)
}

#[near]
impl Contract {
    pub fn get_economic_config(&self) -> EconomicConfigView {
        let config = &self.config;
        EconomicConfigView {
            name: config.name.clone(),
            symbol: config.symbol.clone(),
            decimals: config.decimals,
            spec: config.spec.clone(),
            initial_supply: u128v(config.initial_supply),
            commitment: u128v(config.commitment),
            epoch_duration_ns: u64v(config.epoch_duration_ns),
            entry_window_ns: u64v(config.entry_window_ns),
            min_participants: config.min_participants,
            max_participants: config.max_participants,
            retention_numerator: config.retention_numerator,
            retention_denominator: config.retention_denominator,
            early_exit_penalty_bps: config.early_exit_penalty_bps,
            penalty_burn_share_bps: config.penalty_burn_share_bps,
            penalty_survivor_share_bps: config.penalty_survivor_share_bps,
            mint_rate_bps: config.mint_rate_bps,
            max_mint_per_epoch: u128v(config.max_mint_per_epoch),
            failed_epoch_reserve_burn: u128v(config.failed_epoch_reserve_burn),
            reward_claim_window_ns: u64v(config.reward_claim_window_ns),
            principal_claim_expires: false,
            faucet_enabled: config.faucet_enabled,
            faucet_amount: u128v(config.faucet_amount),
            faucet_cap: u128v(config.faucet_cap),
            deployment_kind: config.deployment_kind.clone(),
            genesis_timestamp_ns: u64v(config.genesis_timestamp_ns),
        }
    }

    pub fn get_current_epoch(&self) -> CurrentEpoch {
        let now = near_sdk::env::block_timestamp();
        let epoch_id = self.epoch_id_at(now);
        let (start, entry_end, end) = self.epoch_bounds(epoch_id);
        CurrentEpoch {
            deployment_kind: self.config.deployment_kind.clone(),
            epoch_duration_ns: u64v(self.config.epoch_duration_ns),
            entry_window_ns: u64v(self.config.entry_window_ns),
            faucet_enabled: self.config.faucet_enabled,
            epoch_id: u64v(epoch_id),
            start_ns: u64v(start),
            entry_end_ns: u64v(entry_end),
            end_ns: u64v(end),
            now_ns: u64v(now),
            phase: self.phase_at(epoch_id, now).to_string(),
            next_epoch_to_finalize: u64v(self.next_epoch_to_finalize),
            current_streak: self.current_streak,
            longest_streak: self.longest_streak,
        }
    }

    pub fn get_epoch_stats(&self, epoch_id: U64) -> EpochStats {
        let detail = self.get_epoch(epoch_id);
        EpochStats {
            epoch_id: detail.epoch_id,
            phase: detail.phase,
            original_participants: detail.original_participants,
            active_participants: detail.active_participants,
            early_exits: detail.early_exits,
            locked_principal: detail.locked_principal,
            survivor_bonus_pool: detail.survivor_bonus_pool,
            retention_bps: detail.retention_bps.unwrap_or(retention_bps(
                detail
                    .original_participants
                    .unwrap_or(detail.active_participants),
                detail.active_participants,
            )),
            projected_success: detail.projected_success,
            finalized: detail.finalized,
            success: detail.success,
        }
    }

    pub fn get_epoch(&self, epoch_id: U64) -> EpochDetail {
        let epoch_id = epoch_id.0;
        let now = near_sdk::env::block_timestamp();
        let (start, entry_end, end) = self.epoch_bounds(epoch_id);
        let epoch = self.load_epoch(epoch_id);
        let original = epoch.original_participant_count;
        let projected = if epoch.finalized {
            epoch.success
        } else if let Some(original) = original {
            Some(retention_succeeded(
                original,
                epoch.active_participant_count,
            ))
        } else {
            None
        };
        let deadline = epoch.finalized_at_ns.map(|stamp| {
            u64v(
                stamp
                    .checked_add(self.config.reward_claim_window_ns)
                    .expect("reward deadline"),
            )
        });
        EpochDetail {
            epoch_id: u64v(epoch_id),
            start_ns: u64v(start),
            entry_end_ns: u64v(entry_end),
            end_ns: u64v(end),
            phase: self.phase_at(epoch_id, now).to_string(),
            original_participants: original,
            active_participants: epoch.active_participant_count,
            early_exits: epoch.early_exit_count,
            locked_principal: u128v(u128::from(epoch.active_participant_count) * COMMITMENT),
            survivor_bonus_pool: u128v(epoch.survivor_bonus_pool),
            exit_burned: u128v(epoch.exit_burned),
            finalized: epoch.finalized,
            success: epoch.success,
            retention_bps: epoch.retention_bps,
            projected_success: projected,
            minted: u128v(epoch.minted),
            reward_per_survivor: u128v(epoch.reward_per_survivor),
            bonus_per_survivor: u128v(epoch.bonus_per_survivor),
            reserve_burned: u128v(epoch.reserve_burned),
            dust_burned: u128v(epoch.dust_burned),
            finalized_at_ns: epoch.finalized_at_ns.map(u64v),
            reward_claim_deadline_ns: deadline,
            unclaimed_mint_remaining: u128v(epoch.unclaimed_mint_remaining),
            unclaimed_bonus_remaining: u128v(epoch.unclaimed_bonus_remaining),
            rewards_swept: epoch.rewards_swept,
        }
    }

    pub fn get_commitment(&self, epoch_id: U64, account_id: AccountId) -> Option<CommitmentView> {
        let epoch = self.load_epoch(epoch_id.0);
        self.load_commitment(epoch_id.0, &account_id)
            .map(|commitment| CommitmentView {
                status: effective_status(commitment.status, epoch.finalized),
                stored_status: commitment.status,
                rewards_claimed: commitment.rewards_claimed,
            })
    }

    pub fn get_user_epoch_state(&self, epoch_id: U64, account_id: AccountId) -> UserEpochState {
        let epoch_id_raw = epoch_id.0;
        let epoch = self.load_epoch(epoch_id_raw);
        let now = near_sdk::env::block_timestamp();
        let commitment = self.load_commitment(epoch_id_raw, &account_id);
        let (status, stored, rewards_claimed) = match commitment {
            Some(commitment) => (
                Some(effective_status(commitment.status, epoch.finalized)),
                Some(commitment.status),
                commitment.rewards_claimed,
            ),
            None => (None, None, false),
        };
        let survivor = stored.is_some_and(is_survivor_record);
        let deadline = epoch
            .finalized_at_ns
            .and_then(|stamp| stamp.checked_add(self.config.reward_claim_window_ns));
        let rewards_open = epoch.finalized
            && !epoch.rewards_swept
            && survivor
            && !rewards_claimed
            && deadline.is_some_and(|deadline| now < deadline);
        let principal_open = epoch.finalized && stored == Some(CommitmentStatus::Active);
        let (mint, bonus) = if rewards_open {
            (epoch.reward_per_survivor, epoch.bonus_per_survivor)
        } else {
            (0, 0)
        };
        let (mint, bonus) = if mint.saturating_add(bonus) == 0 {
            (0, 0)
        } else {
            (mint, bonus)
        };
        UserEpochState {
            epoch_id,
            account_id,
            status,
            stored_status: stored,
            rewards_claimed,
            claimable_principal: u128v(if principal_open { COMMITMENT } else { 0 }),
            claimable_mint: u128v(mint),
            claimable_bonus: u128v(bonus),
            principal_claim_open: principal_open,
            rewards_claim_open: rewards_open && mint.saturating_add(bonus) > 0,
        }
    }

    pub fn get_current_streak(&self) -> u64 {
        self.current_streak
    }

    pub fn get_longest_streak(&self) -> u64 {
        self.longest_streak
    }

    pub fn get_protocol_balances(&self) -> ProtocolBalances {
        ProtocolBalances {
            contract_token_balance: u128v(self.contract_token_balance()),
            burn_reserve: u128v(self.burn_reserve),
            faucet_reserve: u128v(self.faucet_reserve),
            locked_principal: u128v(self.locked_principal),
            unclaimed_mint_rewards: u128v(self.unclaimed_mint_rewards),
            unclaimed_exit_bonuses: u128v(self.unclaimed_exit_bonuses),
            accounting_difference: self.accounting_difference().to_string(),
            total_supply: self.ft_total_supply(),
            total_graded_minted: u128v(self.total_graded_minted),
            total_exit_burned: u128v(self.total_exit_burned),
            total_reserve_burned: u128v(self.total_reserve_burned),
            total_dust_burned: u128v(self.total_dust_burned),
            total_swept_burned: u128v(self.total_swept_burned),
        }
    }

    pub fn get_faucet_status(&self, account_id: Option<AccountId>) -> FaucetStatus {
        FaucetStatus {
            enabled: self.config.faucet_enabled,
            amount: u128v(self.config.faucet_amount),
            cap: u128v(self.config.faucet_cap),
            remaining: u128v(self.faucet_reserve),
            claimed: account_id.map(|account| self.faucet_claims.contains(&account)),
            sybil_resistant: false,
        }
    }
}
