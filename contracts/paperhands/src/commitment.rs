use near_sdk::{AccountId, env, near, require};

use crate::bonuses::early_exit_split;
use crate::config::{COMMITMENT, MAX_PARTICIPANTS};
use crate::events;
use crate::{Contract, ContractExt};

/// Stored commitment. `Survivor` is not written: a still-active commitment on
/// a finalized epoch is a survivor, and views report that status.
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CommitmentStatus {
    Active,
    CancelledDuringEntry,
    ExitedEarly,
    Survivor,
    PrincipalClaimed,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub(crate) struct UserCommitment {
    pub status: CommitmentStatus,
    pub rewards_claimed: bool,
}

pub(crate) fn effective_status(status: CommitmentStatus, finalized: bool) -> CommitmentStatus {
    match status {
        CommitmentStatus::Active if finalized => CommitmentStatus::Survivor,
        other => other,
    }
}

pub(crate) fn is_survivor_record(status: CommitmentStatus) -> bool {
    matches!(
        status,
        CommitmentStatus::Active | CommitmentStatus::PrincipalClaimed
    )
}

impl Contract {
    pub(crate) fn load_commitment(
        &self,
        epoch_id: u64,
        account: &AccountId,
    ) -> Option<UserCommitment> {
        let key = (epoch_id, account.clone());
        self.commitments.get(&key).cloned()
    }

    pub(crate) fn save_commitment(
        &mut self,
        epoch_id: u64,
        account: &AccountId,
        commitment: UserCommitment,
    ) {
        self.commitments
            .insert((epoch_id, account.clone()), commitment);
    }

    fn take_active_commitment(&self, epoch_id: u64, account: &AccountId) -> UserCommitment {
        match self.load_commitment(epoch_id, account) {
            Some(commitment) if commitment.status == CommitmentStatus::Active => commitment,
            Some(_) => env::panic_str("commitment is not active"),
            None => env::panic_str("no commitment for this epoch"),
        }
    }
}

#[near]
impl Contract {
    /// Lock exactly 1,000 PAPER into the current epoch during its entry window.
    #[payable]
    pub fn join_epoch(&mut self) {
        let before = env::storage_usage();
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let epoch_id = self.epoch_id_at(now);
        let (start, entry_end, _) = self.epoch_bounds(epoch_id);
        require!(now >= start, "epoch has not started");
        if now >= entry_end {
            self.ensure_cohort_frozen(epoch_id);
            env::panic_str("entry window is closed");
        }
        require!(
            self.load_commitment(epoch_id, &account).is_none(),
            "account already joined or left this epoch",
        );
        let mut epoch = self.load_epoch(epoch_id);
        require!(
            epoch.active_participant_count < MAX_PARTICIPANTS,
            "epoch participant cap is 500",
        );
        self.assert_registered(&account);
        let balance = self.token.internal_unwrap_balance_of(&account);
        require!(
            balance >= COMMITMENT,
            "insufficient PAPER balance for the 1000 PAPER commitment",
        );

        epoch.active_participant_count = epoch
            .active_participant_count
            .checked_add(1)
            .expect("active participant overflow");
        let active = epoch.active_participant_count;
        self.save_epoch(epoch_id, epoch);
        self.save_commitment(
            epoch_id,
            &account,
            UserCommitment {
                status: CommitmentStatus::Active,
                rewards_claimed: false,
            },
        );
        self.locked_principal = self
            .locked_principal
            .checked_add(COMMITMENT)
            .expect("locked principal");
        let contract_id = env::current_account_id();
        self.transfer_internal(&account, &contract_id, COMMITMENT, "diamond commitment");
        events::epoch_joined(epoch_id, &account, COMMITMENT, active);
        events::commitment_locked(epoch_id, &account, COMMITMENT);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }

    /// Return the full 1,000 PAPER during the entry window. No penalty.
    /// The same account cannot join this epoch again.
    #[payable]
    pub fn cancel_during_entry(&mut self) {
        let before = env::storage_usage();
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let epoch_id = self.epoch_id_at(now);
        let (_, entry_end, _) = self.epoch_bounds(epoch_id);
        if now >= entry_end {
            self.ensure_cohort_frozen(epoch_id);
            env::panic_str("entry window is closed");
        }
        let mut commitment = self.take_active_commitment(epoch_id, &account);
        let mut epoch = self.load_epoch(epoch_id);
        epoch.active_participant_count = epoch
            .active_participant_count
            .checked_sub(1)
            .expect("active participant underflow");
        let active = epoch.active_participant_count;
        commitment.status = CommitmentStatus::CancelledDuringEntry;
        self.save_epoch(epoch_id, epoch);
        self.save_commitment(epoch_id, &account, commitment);
        require!(
            self.locked_principal >= COMMITMENT,
            "locked principal bucket is short"
        );
        self.locked_principal -= COMMITMENT;
        self.assert_registered(&account);
        let contract_id = env::current_account_id();
        self.transfer_internal(&contract_id, &account, COMMITMENT, "entry cancel refund");
        events::epoch_entry_cancelled(epoch_id, &account, COMMITMENT, active);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }

    /// After entry close and before epoch end, return 950, burn 25, and add
    /// 25 to this epoch's survivor-bonus liability.
    #[payable]
    pub fn exit_early(&mut self) {
        let before = env::storage_usage();
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let epoch_id = self.epoch_id_at(now);
        let (_, entry_end, end) = self.epoch_bounds(epoch_id);
        // At an epoch boundary the id rolls forward, so `now < end` is true for
        // the new epoch. An active lock in the epoch that just ended is over.
        if self.load_commitment(epoch_id, &account).is_none() && epoch_id > 0 {
            if let Some(previous) = self.load_commitment(epoch_id - 1, &account) {
                if previous.status == CommitmentStatus::Active {
                    env::panic_str("epoch has ended");
                }
            }
        }
        require!(
            now >= entry_end,
            "early exit opens after the entry window closes"
        );
        require!(now < end, "epoch has ended");
        self.assert_registered(&account);
        self.ensure_cohort_frozen(epoch_id);
        let mut commitment = self.take_active_commitment(epoch_id, &account);
        let mut epoch = self.load_epoch(epoch_id);
        epoch.active_participant_count = epoch
            .active_participant_count
            .checked_sub(1)
            .expect("active participant underflow");
        epoch.early_exit_count = epoch
            .early_exit_count
            .checked_add(1)
            .expect("early exit overflow");
        let split = early_exit_split(COMMITMENT);
        epoch.survivor_bonus_pool = epoch
            .survivor_bonus_pool
            .checked_add(split.bonus)
            .expect("bonus pool");
        epoch.exit_burned = epoch
            .exit_burned
            .checked_add(split.burned)
            .expect("exit burn");
        let active = epoch.active_participant_count;
        commitment.status = CommitmentStatus::ExitedEarly;
        self.save_epoch(epoch_id, epoch);
        self.save_commitment(epoch_id, &account, commitment);
        require!(
            self.locked_principal >= COMMITMENT,
            "locked principal bucket is short"
        );
        self.locked_principal -= COMMITMENT;
        self.unclaimed_exit_bonuses = self
            .unclaimed_exit_bonuses
            .checked_add(split.bonus)
            .expect("bonus bucket");
        self.total_exit_burned = self
            .total_exit_burned
            .checked_add(split.burned)
            .expect("exit burn stat");
        let contract_id = env::current_account_id();
        self.burn_from_contract(split.burned, "early-exit penalty");
        self.transfer_internal(&contract_id, &account, split.returned, "early exit");
        events::early_exit(
            epoch_id,
            &account,
            split.returned,
            split.burned,
            split.bonus,
            active,
        );
        self.assert_accounting();
        self.settle_storage_payment(before);
    }
}
