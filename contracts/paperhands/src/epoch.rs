use near_sdk::{env, near, require};

use crate::Contract;
use crate::events;

/// One epoch record. Absent records behave as an empty, unfinalized epoch.
/// `original_participant_count` stays `None` until the first state-changing
/// call after the entry window, which snapshots `active_participant_count`.
#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct EpochState {
    pub original_participant_count: Option<u32>,
    pub active_participant_count: u32,
    pub early_exit_count: u32,
    pub survivor_bonus_pool: u128,
    pub exit_burned: u128,
    pub finalized: bool,
    pub success: Option<bool>,
    pub retention_bps: Option<u32>,
    pub minted: u128,
    pub reward_per_survivor: u128,
    pub bonus_per_survivor: u128,
    pub reserve_burned: u128,
    pub dust_burned: u128,
    pub finalized_at_ns: Option<u64>,
    pub unclaimed_mint_remaining: u128,
    pub unclaimed_bonus_remaining: u128,
    pub rewards_swept: bool,
}

impl Default for EpochState {
    fn default() -> Self {
        Self {
            original_participant_count: None,
            active_participant_count: 0,
            early_exit_count: 0,
            survivor_bonus_pool: 0,
            exit_burned: 0,
            finalized: false,
            success: None,
            retention_bps: None,
            minted: 0,
            reward_per_survivor: 0,
            bonus_per_survivor: 0,
            reserve_burned: 0,
            dust_burned: 0,
            finalized_at_ns: None,
            unclaimed_mint_remaining: 0,
            unclaimed_bonus_remaining: 0,
            rewards_swept: false,
        }
    }
}

impl Contract {
    pub(crate) fn epoch_bounds(&self, epoch_id: u64) -> (u64, u64, u64) {
        let duration = self.config.epoch_duration_ns;
        let start = self
            .config
            .genesis_timestamp_ns
            .checked_add(epoch_id.checked_mul(duration).expect("epoch id overflow"))
            .expect("epoch start overflow");
        let entry_end = start
            .checked_add(self.config.entry_window_ns)
            .expect("entry end overflow");
        let end = start.checked_add(duration).expect("epoch end overflow");
        (start, entry_end, end)
    }

    pub(crate) fn epoch_id_at(&self, now: u64) -> u64 {
        require!(
            now >= self.config.genesis_timestamp_ns,
            "timestamp is before genesis"
        );
        now.checked_sub(self.config.genesis_timestamp_ns)
            .expect("clock")
            / self.config.epoch_duration_ns
    }

    pub(crate) fn load_epoch(&self, epoch_id: u64) -> EpochState {
        self.epochs.get(&epoch_id).cloned().unwrap_or_default()
    }

    pub(crate) fn save_epoch(&mut self, epoch_id: u64, epoch: EpochState) {
        self.epochs.insert(epoch_id, epoch);
    }

    /// Snapshot the active count once, the first time anything mutates state
    /// after `entry_end`. Views do not write this snapshot.
    pub(crate) fn ensure_cohort_frozen(&mut self, epoch_id: u64) {
        let now = env::block_timestamp();
        let (_, entry_end, _) = self.epoch_bounds(epoch_id);
        if now < entry_end {
            return;
        }
        let mut epoch = self.load_epoch(epoch_id);
        if epoch.original_participant_count.is_none() {
            let original = epoch.active_participant_count;
            epoch.original_participant_count = Some(original);
            self.save_epoch(epoch_id, epoch);
            events::epoch_entry_closed(epoch_id, original);
        }
    }

    pub(crate) fn phase_at(&self, epoch_id: u64, now: u64) -> &'static str {
        let (start, entry_end, end) = self.epoch_bounds(epoch_id);
        if now < start {
            "scheduled"
        } else if now < entry_end {
            "entry"
        } else if now < end {
            "commitment"
        } else {
            "ended"
        }
    }
}
