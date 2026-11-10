use near_sdk::serde_json::{Value, json};
use near_sdk::{AccountId, env};

pub(crate) const STANDARD: &str = "paperhands";
pub(crate) const VERSION: &str = "1.0.0";

pub(crate) fn emit(event: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({
            "standard": STANDARD,
            "version": VERSION,
            "event": event,
            "data": [data],
        })
    ));
}

fn amount(value: u128) -> String {
    value.to_string()
}

pub(crate) fn epoch_joined(epoch_id: u64, account: &AccountId, locked: u128, active: u32) {
    emit(
        "epoch_joined",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(locked),
            "active_participants": active,
        }),
    );
}

pub(crate) fn commitment_locked(epoch_id: u64, account: &AccountId, locked: u128) {
    emit(
        "commitment_locked",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(locked),
        }),
    );
}

pub(crate) fn epoch_entry_cancelled(
    epoch_id: u64,
    account: &AccountId,
    refunded: u128,
    active: u32,
) {
    emit(
        "epoch_entry_cancelled",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(refunded),
            "active_participants": active,
        }),
    );
}

pub(crate) fn epoch_entry_closed(epoch_id: u64, original: u32) {
    emit(
        "epoch_entry_closed",
        json!({
            "epoch_id": epoch_id,
            "original_participants": original,
        }),
    );
}

pub(crate) fn early_exit(
    epoch_id: u64,
    account: &AccountId,
    returned: u128,
    burned: u128,
    bonus: u128,
    active: u32,
) {
    emit(
        "early_exit",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "returned": amount(returned),
            "burned": amount(burned),
            "bonus": amount(bonus),
            "active_participants": active,
        }),
    );
    emit(
        "early_exit_penalty_burn",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(burned),
        }),
    );
    emit(
        "survivor_bonus_accrued",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(bonus),
        }),
    );
}

pub(crate) fn epoch_finalized(success: bool, data: Value) {
    emit(
        if success {
            "epoch_finalized_success"
        } else {
            "epoch_finalized_failure"
        },
        data,
    );
}

pub(crate) fn graded_reward_minted(epoch_id: u64, minted: u128, per_survivor: u128) {
    emit(
        "graded_reward_minted",
        json!({
            "epoch_id": epoch_id,
            "amount": amount(minted),
            "per_survivor": amount(per_survivor),
        }),
    );
}

pub(crate) fn failed_epoch_reserve_burn(epoch_id: u64, burned: u128) {
    emit(
        "failed_epoch_reserve_burn",
        json!({
            "epoch_id": epoch_id,
            "amount": amount(burned),
        }),
    );
}

pub(crate) fn principal_claimed(epoch_id: u64, account: &AccountId, amount_value: u128) {
    emit(
        "principal_claimed",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "amount": amount(amount_value),
        }),
    );
}

pub(crate) fn epoch_reward_claimed(epoch_id: u64, account: &AccountId, mint: u128, bonus: u128) {
    emit(
        "epoch_reward_claimed",
        json!({
            "epoch_id": epoch_id,
            "account_id": account.to_string(),
            "mint": amount(mint),
            "bonus": amount(bonus),
            "amount": amount(mint.checked_add(bonus).expect("reward amount")),
        }),
    );
    if bonus > 0 {
        emit(
            "survivor_bonus_claimed",
            json!({
                "epoch_id": epoch_id,
                "account_id": account.to_string(),
                "amount": amount(bonus),
            }),
        );
    }
}

pub(crate) fn unclaimed_rewards_swept(epoch_id: u64, mint: u128, bonus: u128) {
    emit(
        "unclaimed_rewards_swept",
        json!({
            "epoch_id": epoch_id,
            "mint": amount(mint),
            "bonus": amount(bonus),
            "amount": amount(mint.checked_add(bonus).expect("sweep amount")),
        }),
    );
}

pub(crate) fn community_streak_updated(
    epoch_id: u64,
    previous: u64,
    current: u64,
    longest: u64,
    success: bool,
) {
    emit(
        "community_streak_updated",
        json!({
            "epoch_id": epoch_id,
            "previous_streak": previous,
            "current_streak": current,
            "longest_streak": longest,
            "success": success,
        }),
    );
}

pub(crate) fn faucet_claimed(account: &AccountId, claimed: u128, remaining: u128) {
    emit(
        "faucet_claimed",
        json!({
            "account_id": account.to_string(),
            "amount": amount(claimed),
            "remaining": amount(remaining),
        }),
    );
}
