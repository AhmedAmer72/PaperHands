use near_sdk::json_types::U64;
use near_sdk::{AccountId, env, near, require};

use crate::commitment::{CommitmentStatus, is_survivor_record};
use crate::config::COMMITMENT;
use crate::events;
use crate::{Contract, ContractExt};

impl Contract {
    fn reward_deadline(&self, finalized_at: u64) -> u64 {
        finalized_at
            .checked_add(self.config.reward_claim_window_ns)
            .expect("reward deadline")
    }

    fn take_commitment_for_claim(
        &self,
        epoch_id: u64,
        account: &AccountId,
    ) -> (crate::epoch::EpochState, crate::commitment::UserCommitment) {
        let epoch = self.load_epoch(epoch_id);
        require!(epoch.finalized, "epoch is not finalized");
        let commitment = match self.load_commitment(epoch_id, account) {
            Some(commitment) => commitment,
            None => env::panic_str("no commitment for this epoch"),
        };
        (epoch, commitment)
    }
}

#[near]
impl Contract {
    /// Survivors claim exactly 1,000 PAPER. The claim never expires.
    #[payable]
    pub fn claim_principal(&mut self, epoch_id: U64) {
        let before = env::storage_usage();
        let epoch_id = epoch_id.0;
        let account = env::predecessor_account_id();
        self.assert_registered(&account);
        let (_epoch, mut commitment) = self.take_commitment_for_claim(epoch_id, &account);
        require!(
            commitment.status == CommitmentStatus::Active,
            "only an unclaimed survivor can claim principal",
        );
        require!(
            self.locked_principal >= COMMITMENT,
            "locked principal bucket is short"
        );
        self.locked_principal -= COMMITMENT;
        commitment.status = CommitmentStatus::PrincipalClaimed;
        self.save_commitment(epoch_id, &account, commitment);
        let contract_id = env::current_account_id();
        self.transfer_internal(&contract_id, &account, COMMITMENT, "principal claim");
        events::principal_claimed(epoch_id, &account, COMMITMENT);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }

    /// Equal mint share plus equal bonus share. Closes 30 days after finalization.
    #[payable]
    pub fn claim_epoch_rewards(&mut self, epoch_id: U64) {
        let before = env::storage_usage();
        let epoch_id = epoch_id.0;
        let account = env::predecessor_account_id();
        self.assert_registered(&account);
        let (mut epoch, mut commitment) = self.take_commitment_for_claim(epoch_id, &account);
        require!(!epoch.rewards_swept, "unclaimed rewards were swept");
        let finalized_at = epoch.finalized_at_ns.expect("finalized timestamp");
        let deadline = self.reward_deadline(finalized_at);
        require!(
            env::block_timestamp() < deadline,
            "reward claim window has closed"
        );
        require!(
            is_survivor_record(commitment.status),
            "only a survivor can claim rewards",
        );
        require!(!commitment.rewards_claimed, "rewards already claimed");
        let mint = epoch.reward_per_survivor;
        let bonus = epoch.bonus_per_survivor;
        let total = mint.checked_add(bonus).expect("reward total");
        require!(total > 0, "no rewards to claim");
        require!(
            epoch.unclaimed_mint_remaining >= mint,
            "mint remainder is short"
        );
        require!(
            epoch.unclaimed_bonus_remaining >= bonus,
            "bonus remainder is short"
        );
        require!(self.unclaimed_mint_rewards >= mint, "mint bucket is short");
        require!(
            self.unclaimed_exit_bonuses >= bonus,
            "bonus bucket is short"
        );

        commitment.rewards_claimed = true;
        epoch.unclaimed_mint_remaining -= mint;
        epoch.unclaimed_bonus_remaining -= bonus;
        self.unclaimed_mint_rewards -= mint;
        self.unclaimed_exit_bonuses -= bonus;
        self.save_epoch(epoch_id, epoch);
        self.save_commitment(epoch_id, &account, commitment);
        let contract_id = env::current_account_id();
        self.transfer_internal(&contract_id, &account, total, "epoch rewards");
        events::epoch_reward_claimed(epoch_id, &account, mint, bonus);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }

    /// Burn unclaimed mint and unclaimed bonus for one finalized epoch.
    /// Principal is not burned.
    #[payable]
    pub fn sweep_unclaimed_epoch_rewards(&mut self, epoch_id: U64) {
        let before = env::storage_usage();
        let epoch_id = epoch_id.0;
        let mut epoch = self.load_epoch(epoch_id);
        require!(epoch.finalized, "epoch is not finalized");
        require!(!epoch.rewards_swept, "unclaimed rewards already swept");
        let finalized_at = epoch.finalized_at_ns.expect("finalized timestamp");
        let deadline = self.reward_deadline(finalized_at);
        require!(
            env::block_timestamp() >= deadline,
            "reward claim window is still open"
        );
        let mint_left = epoch.unclaimed_mint_remaining;
        let bonus_left = epoch.unclaimed_bonus_remaining;
        require!(
            self.unclaimed_mint_rewards >= mint_left,
            "mint bucket is short"
        );
        require!(
            self.unclaimed_exit_bonuses >= bonus_left,
            "bonus bucket is short"
        );
        self.unclaimed_mint_rewards -= mint_left;
        self.unclaimed_exit_bonuses -= bonus_left;
        if mint_left > 0 {
            self.burn_from_contract(mint_left, "swept unclaimed mint");
        }
        if bonus_left > 0 {
            self.burn_from_contract(bonus_left, "swept unclaimed bonus");
        }
        self.total_swept_burned = self
            .total_swept_burned
            .checked_add(mint_left)
            .expect("sweep stat")
            .checked_add(bonus_left)
            .expect("sweep stat");
        epoch.unclaimed_mint_remaining = 0;
        epoch.unclaimed_bonus_remaining = 0;
        epoch.rewards_swept = true;
        self.save_epoch(epoch_id, epoch);
        events::unclaimed_rewards_swept(epoch_id, mint_left, bonus_left);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }
}
