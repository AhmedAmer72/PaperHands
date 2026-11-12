use super::*;
use conviction::{CLAIM_WINDOW_NS, COMMITMENT, DEMO_DURATION_NS, DEMO_ENTRY_NS, ONE_PAPER};
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::{U64, U128};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{AccountId, Gas, NearToken, PromiseError, PromiseOrValue, testing_env};

fn account(name: &str) -> AccountId {
    name.parse().unwrap()
}

fn paper_token() -> AccountId {
    account("diabloodevs.testnet")
}

fn hub_account() -> AccountId {
    account("hub.testnet")
}

fn sponsor() -> AccountId {
    account("sponsor.testnet")
}

fn user(index: u32) -> AccountId {
    account(&format!("user{index}.testnet"))
}

fn yocto() -> NearToken {
    NearToken::from_yoctonear(1)
}

fn clear_storage() {
    let _ = near_sdk::mock::with_mocked_blockchain(|blockchain| blockchain.take_storage());
}

fn set_env(predecessor: &AccountId, deposit: NearToken, timestamp: u64) {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(hub_account())
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor.clone())
        .attached_deposit(deposit)
        .block_timestamp(timestamp)
        .account_balance(NearToken::from_near(50))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(builder.build());
}

fn boot(now: u64) -> Contract {
    clear_storage();
    set_env(&hub_account(), NearToken::from_near(2), now);
    Contract::new(
        paper_token(),
        "demo-testnet".into(),
        account("pauser.testnet"),
        account("proposer.testnet"),
        account("approver.testnet"),
    )
}

fn unused(result: PromiseOrValue<U128>) -> u128 {
    match result {
        PromiseOrValue::Value(amount) => amount.0,
        PromiseOrValue::Promise(_) => panic!("ft_on_transfer returned a promise"),
    }
}

fn create(contract: &mut Contract, now: u64, reward: u128, min_original: u32, cap: u32) -> u64 {
    set_env(&sponsor(), yocto(), now);
    contract
        .create_campaign(
            "Diamond week".into(),
            "Stay through the sponsored epoch.".into(),
            "https://example.com/campaign".into(),
            U128(reward),
            min_original,
            8_000,
            cap,
        )
        .0
}

fn fund(contract: &mut Contract, now: u64, id: u64, reward: u128) -> u128 {
    set_env(&paper_token(), NearToken::from_yoctonear(0), now);
    unused(contract.ft_on_transfer(
        sponsor(),
        U128(reward),
        format!(r#"{{"action":"fund_reward","campaign_id":{id}}}"#),
    ))
}

fn open(contract: &mut Contract, now: u64, id: u64) {
    set_env(&sponsor(), yocto(), now);
    contract.open_campaign(U64(id));
}

fn join(contract: &mut Contract, now: u64, id: u64, account_id: &AccountId) -> u128 {
    set_env(&paper_token(), NearToken::from_yoctonear(0), now);
    unused(contract.ft_on_transfer(
        account_id.clone(),
        U128(COMMITMENT),
        format!(r#"{{"action":"join","campaign_id":{id}}}"#),
    ))
}

fn join_many(contract: &mut Contract, now: u64, id: u64, count: u32) {
    for index in 0..count {
        assert_eq!(join(contract, now, id, &user(index)), 0);
    }
}

fn activate(contract: &mut Contract, now: u64, id: u64) {
    set_env(&account("sentinel.testnet"), yocto(), now);
    contract.activate_campaign(U64(id));
}

fn finalize(contract: &mut Contract, now: u64, id: u64) {
    set_env(&account("sentinel.testnet"), yocto(), now);
    contract.finalize_campaign(U64(id));
}

fn books(contract: &Contract, id: u64) -> AccountingView {
    set_env(&hub_account(), NearToken::from_yoctonear(0), 1);
    contract.get_campaign_accounting(U64(id))
}

fn callback(contract: &mut Contract, now: u64, transfer_id: u64, ok: bool) {
    set_env(&hub_account(), NearToken::from_yoctonear(0), now);
    let result = if ok {
        Ok(())
    } else {
        Err(PromiseError::Failed)
    };
    contract.on_transfer_complete(U64(transfer_id), result);
}

#[test]
fn wrong_amount_and_foreign_token_do_not_take_funds() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, 1_000 * ONE_PAPER, 25, 30);
    let unused_amount = fund(&mut contract, now, id, 999 * ONE_PAPER);
    assert_eq!(unused_amount, 999 * ONE_PAPER);
    assert_eq!(books(&contract, id).assets.0, 0);
    assert_eq!(fund(&mut contract, now, id, 1_000 * ONE_PAPER), 0);
    assert_eq!(books(&contract, id).sponsor_reward_liability.0, 1_000 * ONE_PAPER);
    assert_eq!(books(&contract, id).accounting_difference, "0");
}

#[test]
#[should_panic(expected = "token contract is not PAPER")]
fn forged_ft_on_transfer_is_rejected() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    set_env(&account("evil.testnet"), NearToken::from_yoctonear(0), now);
    let _ = contract.ft_on_transfer(
        sponsor(),
        U128(COMMITMENT),
        format!(r#"{{"action":"fund_reward","campaign_id":{id}}}"#),
    );
}

#[test]
#[should_panic(expected = "malformed sponsor message")]
fn malformed_message_is_rejected() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    set_env(&paper_token(), NearToken::from_yoctonear(0), now);
    let _ = contract.ft_on_transfer(sponsor(), U128(1), "not-json".into());
}

#[test]
#[should_panic(expected = "minimum originals cannot be below 25")]
fn sponsor_cannot_weaken_the_minimum() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    create(&mut contract, now, COMMITMENT, 24, 24);
}

#[test]
fn cancel_before_join_refunds_the_full_pool_once() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, 2_000 * ONE_PAPER, 25, 25);
    fund(&mut contract, now, id, 2_000 * ONE_PAPER);
    open(&mut contract, now, id);
    set_env(&sponsor(), yocto(), now);
    contract.cancel_campaign(U64(id));
    assert_eq!(contract.get_campaign(U64(id)).state, "CancelledBeforeJoin");
    assert_eq!(books(&contract, id).refund_liability.0, 2_000 * ONE_PAPER);
    set_env(&sponsor(), yocto(), now);
    let _ = contract.refund_sponsor(U64(id));
    assert!(contract.get_transfer(U64(1)).is_some());
    callback(&mut contract, now, 1, true);
    let books = books(&contract, id);
    assert_eq!(books.assets.0, 0);
    assert_eq!(books.refund_liability.0, 0);
    assert_eq!(books.accounting_difference, "0");
}

#[test]
#[should_panic(expected = "sponsor cannot cancel after a participant joins")]
fn sponsor_cannot_cancel_after_join() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join(&mut contract, now, id, &user(0));
    set_env(&sponsor(), yocto(), now + 1);
    contract.cancel_campaign(U64(id));
}

#[test]
fn entry_cancel_returns_full_principal_and_blocks_rejoin() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join(&mut contract, now, id, &user(0));
    set_env(&user(0), yocto(), now + 1);
    contract.cancel_join(U64(id));
    let view = contract.get_participant(U64(id), user(0)).unwrap();
    assert_eq!(view.status, "Cancelled");
    assert_eq!(view.principal_available.0, COMMITMENT);
    set_env(&user(0), yocto(), now + 2);
    let _ = contract.claim_principal(U64(id));
    callback(&mut contract, now + 2, 1, false);
    let restored = contract.get_participant(U64(id), user(0)).unwrap();
    assert_eq!(restored.principal_available.0, COMMITMENT);
    assert!(!restored.principal_pending);
    set_env(&user(0), yocto(), now + 3);
    let _ = contract.claim_principal(U64(id));
    callback(&mut contract, now + 3, 2, true);
    let books = books(&contract, id);
    assert_eq!(books.principal_liability.0, 0);
    assert_eq!(books.assets.0, COMMITMENT);
    assert_eq!(books.sponsor_reward_liability.0, COMMITMENT);
    assert_eq!(books.accounting_difference, "0");
}

#[test]
#[should_panic(expected = "account already joined or left this campaign")]
fn the_same_account_cannot_rejoin() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join(&mut contract, now, id, &user(0));
    set_env(&user(0), yocto(), now + 1);
    contract.cancel_join(U64(id));
    join(&mut contract, now + 2, id, &user(0));
}

#[test]
fn early_exit_books_bonus_and_reserve_without_a_burn() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    let active_at = now + DEMO_ENTRY_NS;
    activate(&mut contract, active_at, id);
    set_env(&user(24), yocto(), active_at + 1);
    contract.exit_early(U64(id));
    let books = books(&contract, id);
    assert_eq!(books.survivor_bonus_liability.0, 25 * ONE_PAPER);
    assert_eq!(books.protocol_reserve.0, 25 * ONE_PAPER);
    assert_eq!(books.principal_liability.0, 24 * COMMITMENT + 950 * ONE_PAPER);
    assert_eq!(books.accounting_difference, "0");
    let view = contract.get_participant(U64(id), user(24)).unwrap();
    assert_eq!(view.principal_available.0, 950 * ONE_PAPER);
    assert_eq!(view.status, "Exited");
}

#[test]
fn success_pays_survivors_and_keeps_dust_refundable() {
    let now = 1_000_000_000_000_000;
    let reward = 1_000 * ONE_PAPER;
    let mut contract = boot(now);
    let id = create(&mut contract, now, reward, 25, 25);
    fund(&mut contract, now, id, reward);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    activate(&mut contract, now + DEMO_ENTRY_NS, id);
    set_env(&user(24), yocto(), now + DEMO_ENTRY_NS + 1);
    contract.exit_early(U64(id));
    finalize(&mut contract, now + DEMO_DURATION_NS, id);
    let campaign = contract.get_campaign(U64(id));
    assert_eq!(campaign.state, "FinalizedSuccess");
    assert_eq!(campaign.original_participants, 25);
    assert_eq!(campaign.active_participants, 24);
    assert_eq!(campaign.retention_bps, 9_600);
    assert_eq!(campaign.sponsor_share.0, 4_166_666_666);
    assert_eq!(campaign.bonus_per_survivor.0, 104_166_666);
    assert!(campaign.success.unwrap());
    let settled = books(&contract, id);
    assert_eq!(settled.refund_liability.0, 16);
    assert_eq!(settled.sponsor_reward_liability.0, 24 * 4_166_666_666);
    assert_eq!(settled.protocol_reserve.0, 25 * ONE_PAPER + 16);
    assert_eq!(settled.accounting_difference, "0");
    set_env(&user(0), yocto(), now + DEMO_DURATION_NS + 1);
    let _ = contract.claim_sponsor_reward(U64(id));
    callback(&mut contract, now + DEMO_DURATION_NS + 1, 1, true);
    set_env(&user(0), yocto(), now + DEMO_DURATION_NS + 2);
    let _ = contract.claim_principal(U64(id));
    callback(&mut contract, now + DEMO_DURATION_NS + 2, 2, true);
    let after = books(&contract, id);
    assert_eq!(after.accounting_difference, "0");
    assert!(after.assets.0 < settled.assets.0);
}

#[test]
fn below_minimum_and_below_retention_refund_the_sponsor() {
    let now = 1_000_000_000_000_000;
    let reward = 500 * ONE_PAPER;
    let mut contract = boot(now);
    let short = create(&mut contract, now, reward, 25, 30);
    fund(&mut contract, now, short, reward);
    open(&mut contract, now, short);
    join_many(&mut contract, now, short, 24);
    finalize(&mut contract, now + DEMO_DURATION_NS, short);
    let campaign = contract.get_campaign(U64(short));
    assert_eq!(campaign.state, "FinalizedFailed");
    assert_eq!(campaign.original_participants, 24);
    assert!(!campaign.success.unwrap());
    assert_eq!(books(&contract, short).refund_liability.0, reward);
    assert_eq!(books(&contract, short).sponsor_reward_liability.0, 0);
    assert_eq!(books(&contract, short).accounting_difference, "0");

    let weak = create(&mut contract, now, reward, 25, 25);
    fund(&mut contract, now, weak, reward);
    open(&mut contract, now, weak);
    join_many(&mut contract, now, weak, 25);
    activate(&mut contract, now + DEMO_ENTRY_NS, weak);
    for index in 0..6 {
        set_env(&user(index), yocto(), now + DEMO_ENTRY_NS + 2);
        contract.exit_early(U64(weak));
    }
    finalize(&mut contract, now + DEMO_DURATION_NS, weak);
    let failed = contract.get_campaign(U64(weak));
    assert_eq!(failed.state, "FinalizedFailed");
    assert_eq!(failed.active_participants, 19);
    assert_eq!(failed.retention_bps, 7_600);
    assert_eq!(failed.sponsor_share.0, 0);
    let books = books(&contract, weak);
    assert_eq!(books.refund_liability.0, reward);
    assert_eq!(books.survivor_bonus_liability.0, 19 * 789_473_684);
    assert_eq!(books.protocol_reserve.0, 6 * 25 * ONE_PAPER + 4);
    assert_eq!(books.accounting_difference, "0");
    let survivor = contract.get_participant(U64(weak), user(6)).unwrap();
    assert_eq!(survivor.status, "Survivor");
    assert_eq!(survivor.principal_available.0, COMMITMENT);
    assert_eq!(survivor.sponsor_reward_available.0, 0);
}

#[test]
#[should_panic(expected = "campaign is already finalized")]
fn finalize_cannot_run_twice() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    finalize(&mut contract, now + DEMO_DURATION_NS, id);
    finalize(&mut contract, now + DEMO_DURATION_NS + 1, id);
}

#[test]
#[should_panic(expected = "campaign has not ended")]
fn finalize_before_the_end_is_rejected() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    activate(&mut contract, now + DEMO_ENTRY_NS, id);
    finalize(&mut contract, now + DEMO_ENTRY_NS + 1, id);
}

#[test]
fn sweep_returns_unclaimed_rewards_and_leaves_principal() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, 1_000 * ONE_PAPER, 25, 25);
    fund(&mut contract, now, id, 1_000 * ONE_PAPER);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    finalize(&mut contract, now + DEMO_DURATION_NS, id);
    let before = books(&contract, id).principal_liability.0;
    let sweep_at = now + DEMO_DURATION_NS + CLAIM_WINDOW_NS;
    set_env(&account("sentinel.testnet"), yocto(), sweep_at);
    contract.sweep_expired_rewards(U64(id));
    let swept = books(&contract, id);
    assert_eq!(contract.get_campaign(U64(id)).state, "Swept");
    assert_eq!(swept.principal_liability.0, before);
    assert_eq!(swept.sponsor_reward_liability.0, 0);
    assert!(swept.refund_liability.0 > 0);
    assert_eq!(swept.accounting_difference, "0");
    set_env(&user(0), yocto(), sweep_at + 1);
    let _ = contract.claim_principal(U64(id));
    callback(&mut contract, sweep_at + 1, 1, true);
    assert_eq!(books(&contract, id).principal_liability.0, before - COMMITMENT);
}

#[test]
#[should_panic(expected = "sponsor rewards were swept")]
fn swept_rewards_cannot_be_claimed() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join_many(&mut contract, now, id, 25);
    finalize(&mut contract, now + DEMO_DURATION_NS, id);
    let sweep_at = now + DEMO_DURATION_NS + CLAIM_WINDOW_NS;
    set_env(&account("sentinel.testnet"), yocto(), sweep_at);
    contract.sweep_expired_rewards(U64(id));
    set_env(&user(0), yocto(), sweep_at + 1);
    let _ = contract.claim_sponsor_reward(U64(id));
}

#[test]
fn pause_blocks_joins_and_not_principal_claims() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    join(&mut contract, now, id, &user(0));
    set_env(&user(0), yocto(), now + 1);
    contract.cancel_join(U64(id));
    set_env(&account("pauser.testnet"), yocto(), now + 2);
    contract.pause_new_joins();
    set_env(&user(0), yocto(), now + 3);
    let _ = contract.claim_principal(U64(id));
    assert!(contract.get_transfer(U64(1)).is_some());
}

#[test]
#[should_panic(expected = "joins are paused")]
fn pause_rejects_a_new_join() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let id = create(&mut contract, now, COMMITMENT, 25, 25);
    fund(&mut contract, now, id, COMMITMENT);
    open(&mut contract, now, id);
    set_env(&account("pauser.testnet"), yocto(), now);
    contract.pause_new_joins();
    join(&mut contract, now + 1, id, &user(0));
}

#[test]
fn two_campaigns_do_not_share_a_balance() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    let first = create(&mut contract, now, COMMITMENT, 25, 25);
    let second = create(&mut contract, now, 2 * COMMITMENT, 25, 40);
    fund(&mut contract, now, first, COMMITMENT);
    fund(&mut contract, now, second, 2 * COMMITMENT);
    assert_eq!(books(&contract, first).assets.0, COMMITMENT);
    assert_eq!(books(&contract, second).assets.0, 2 * COMMITMENT);
    assert_eq!(books(&contract, first).accounting_difference, "0");
    assert_eq!(books(&contract, second).accounting_difference, "0");
}

#[test]
fn allowlist_needs_two_accounts_and_still_accepts_only_paper() {
    let now = 1_000_000_000_000_000;
    let mut contract = boot(now);
    set_env(&account("proposer.testnet"), yocto(), now);
    contract.propose_token_allowlist(account("other.token.testnet"), true);
    set_env(&account("approver.testnet"), yocto(), now);
    contract.approve_token_allowlist(account("other.token.testnet"), true);
    let allowed = contract.get_allowed_tokens();
    assert_eq!(allowed.len(), 1);
    assert_eq!(allowed[0].token_id, paper_token());
    assert!(allowed[0].transfers_accepted);
}

#[test]
fn demo_config_is_labelled_separately_from_production() {
    let now = 1_000_000_000_000_000;
    let contract = boot(now);
    let config = contract.get_protocol_config();
    assert_eq!(config.deployment_kind, "demo-testnet");
    assert!(config.demo_clock);
    assert!(!config.early_exit_burned);
    assert_eq!(config.protocol_fee_bps, 0);
    assert_eq!(config.commitment_amount.0, COMMITMENT);
    clear_storage();
    set_env(&hub_account(), NearToken::from_near(2), now);
    let production = Contract::new(
        paper_token(),
        "production".into(),
        account("pauser.testnet"),
        account("proposer.testnet"),
        account("approver.testnet"),
    );
    let config = production.get_protocol_config();
    assert_eq!(config.deployment_kind, "production");
    assert!(!config.demo_clock);
    assert_eq!(config.claim_window_ns.0, CLAIM_WINDOW_NS);
}
