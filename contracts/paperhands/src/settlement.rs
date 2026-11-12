use near_sdk::json_types::U64;
use near_sdk::serde_json::json;
use near_sdk::{env, near, require};

use crate::bonuses::{
    failed_reserve_burn, graded_emission, retention_bps, retention_succeeded, split_bonus,
};
use crate::events;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Finalize exactly `next_epoch_to_finalize`, once, after that epoch has
    /// ended. Any account may call it. Empty epochs are finalized in order
    /// and still burn up to 250 PAPER from the burn reserve.
    #[payable]
    pub fn finalize_epoch(&mut self, epoch_id: U64) {
        let before = env::storage_usage();
        let epoch_id = epoch_id.0;
        let now = env::block_timestamp();
        let next = self.next_epoch_to_finalize;
        let message = format!("epochs finalize in order; next epoch is {next}");
        require!(epoch_id == next, message);
        let (_, _, end) = self.epoch_bounds(epoch_id);
        require!(now >= end, "epoch has not ended");
        self.ensure_cohort_frozen(epoch_id);

        let mut epoch = self.load_epoch(epoch_id);
        require!(!epoch.finalized, "epoch is already finalized");
        let original = epoch.original_participant_count.unwrap_or(0);
        let survivors = epoch.active_participant_count;
        let success = retention_succeeded(original, survivors);
        let retention = retention_bps(original, survivors);
        let emission = graded_emission(original, survivors);
        let bonus = split_bonus(epoch.survivor_bonus_pool, survivors);
        require!(
            self.unclaimed_exit_bonuses >= bonus.dust,
            "bonus dust exceeds the bonus bucket",
        );
        let reserve_burn = failed_reserve_burn(self.burn_reserve, success);
        let previous_streak = self.current_streak;
        if success {
            self.current_streak = self.current_streak.checked_add(1).expect("streak overflow");
            if self.current_streak > self.longest_streak {
                self.longest_streak = self.current_streak;
            }
        } else {
            self.current_streak = 0;
        }

        if emission.minted > 0 {
            self.mint_to_contract(emission.minted, "graded epoch emission");
            self.unclaimed_mint_rewards = self
                .unclaimed_mint_rewards
                .checked_add(emission.minted)
                .expect("mint bucket");
            self.total_graded_minted = self
                .total_graded_minted
                .checked_add(emission.minted)
                .expect("mint stat");
        }
        if bonus.dust > 0 {
            self.unclaimed_exit_bonuses -= bonus.dust;
            self.burn_from_contract(bonus.dust, "bonus dust");
            self.total_dust_burned = self
                .total_dust_burned
                .checked_add(bonus.dust)
                .expect("dust stat");
        }
        if reserve_burn > 0 {
            self.burn_reserve -= reserve_burn;
            self.burn_from_contract(reserve_burn, "failed-epoch reserve");
            self.total_reserve_burned = self
                .total_reserve_burned
                .checked_add(reserve_burn)
                .expect("reserve stat");
        }

        epoch.finalized = true;
        epoch.success = Some(success);
        epoch.retention_bps = Some(retention);
        epoch.minted = emission.minted;
        epoch.reward_per_survivor = emission.per_survivor;
        epoch.bonus_per_survivor = bonus.per_survivor;
        epoch.reserve_burned = reserve_burn;
        epoch.dust_burned = bonus.dust;
        epoch.finalized_at_ns = Some(now);
        epoch.unclaimed_mint_remaining = emission.minted;
        epoch.unclaimed_bonus_remaining = bonus.distributable;
        self.save_epoch(epoch_id, epoch.clone());
        self.next_epoch_to_finalize = self
            .next_epoch_to_finalize
            .checked_add(1)
            .expect("next epoch");

        let data = json!({
            "epoch_id": epoch_id,
            "original_participants": original,
            "survivors": survivors,
            "early_exits": epoch.early_exit_count,
            "retention_bps": retention,
            "minted": emission.minted.to_string(),
            "reward_per_survivor": emission.per_survivor.to_string(),
            "bonus_per_survivor": bonus.per_survivor.to_string(),
            "bonus_dust_burned": bonus.dust.to_string(),
            "reserve_burned": reserve_burn.to_string(),
            "exit_burned": epoch.exit_burned.to_string(),
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
        });
        events::epoch_finalized(success, data);
        events::graded_reward_minted(epoch_id, emission.minted, emission.per_survivor);
        if !success {
            events::failed_epoch_reserve_burn(epoch_id, reserve_burn);
        }
        events::community_streak_updated(
            epoch_id,
            previous_streak,
            self.current_streak,
            self.longest_streak,
            success,
        );
        self.assert_accounting();
        self.settle_storage_payment(before);
    }
}
