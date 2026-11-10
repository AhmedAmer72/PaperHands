use super::*;
use crate::bonuses::{early_exit_split, graded_emission, retention_succeeded, split_bonus};
use crate::config::{
    BURN_RESERVE, COMMITMENT, DEMO_ENTRY_NS, DEMO_EPOCH_NS, FAILED_EPOCH_BURN, FAUCET_AMOUNT,
    FAUCET_RESERVE, INITIAL_SUPPLY, MAX_MINT_PER_EPOCH, MAX_PARTICIPANTS, ONE_PAPER,
    PRODUCTION_ENTRY_NS, PRODUCTION_EPOCH_NS,
};
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::metadata::FungibleTokenMetadataProvider;
use near_contract_standards::storage_management::StorageManagement;
use near_sdk::json_types::{U64, U128};
use near_sdk::test_utils::{VMContextBuilder, get_logs};
use near_sdk::{AccountId, Gas, NearToken, testing_env};

fn contract_account() -> AccountId {
    "paperhands.test.near".parse().unwrap()
}

fn user(index: u32) -> AccountId {
    format!("u{index}.test.near").parse().unwrap()
}

fn paper(whole: u128) -> u128 {
    whole * ONE_PAPER
}

fn clear_storage() {
    let _ = near_sdk::mock::with_mocked_blockchain(|blockchain| blockchain.take_storage());
}

fn set_env(predecessor: &AccountId, deposit: NearToken, timestamp: u64) {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(contract_account())
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor.clone())
        .attached_deposit(deposit)
        .block_timestamp(timestamp)
        .account_balance(NearToken::from_near(10_000))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(builder.build());
}

struct World {
    contract: Contract,
    genesis: u64,
    duration: u64,
    entry: u64,
}

impl World {
    fn boot(demo: bool) -> Self {
        let genesis = 1_000_000_000_000;
        clear_storage();
        set_env(&contract_account(), NearToken::from_yoctonear(0), genesis);
        let contract = if demo {
            Contract::new(
                U64(DEMO_EPOCH_NS),
                U64(DEMO_ENTRY_NS),
                true,
                "demo-testnet".into(),
            )
        } else {
            Contract::new(
                U64(PRODUCTION_EPOCH_NS),
                U64(PRODUCTION_ENTRY_NS),
                false,
                "production".into(),
            )
        };
        Self {
            contract,
            genesis,
            duration: if demo {
                DEMO_EPOCH_NS
            } else {
                PRODUCTION_EPOCH_NS
            },
            entry: if demo {
                DEMO_ENTRY_NS
            } else {
                PRODUCTION_ENTRY_NS
            },
        }
    }

    fn demo() -> Self {
        Self::boot(true)
    }

    fn production() -> Self {
        Self::boot(false)
    }

    fn at(&self, account: &AccountId, deposit: NearToken, timestamp: u64) {
        set_env(account, deposit, timestamp);
    }

    fn register(&mut self, account: &AccountId, timestamp: u64) {
        self.at(account, NearToken::from_near(1), timestamp);
        self.contract.storage_deposit(None, None);
    }

    fn fund(&mut self, account: &AccountId, amount: u128, timestamp: u64) {
        self.at(account, NearToken::from_yoctonear(0), timestamp);
        self.contract.faucet_reserve = self
            .contract
            .faucet_reserve
            .checked_sub(amount)
            .expect("test fund");
        let contract_id = contract_account();
        self.contract
            .transfer_internal(&contract_id, account, amount, "test fund");
        self.contract.assert_accounting();
    }

    fn prepare(&mut self, account: &AccountId, timestamp: u64) {
        self.register(account, timestamp);
        self.fund(account, COMMITMENT, timestamp);
    }

    fn join(&mut self, account: &AccountId, timestamp: u64) {
        self.at(account, NearToken::from_near(1), timestamp);
        self.contract.join_epoch();
    }

    fn cancel(&mut self, account: &AccountId, timestamp: u64) {
        self.at(account, NearToken::from_near(1), timestamp);
        self.contract.cancel_during_entry();
    }

    fn exit(&mut self, account: &AccountId, timestamp: u64) {
        self.at(account, NearToken::from_near(1), timestamp);
        self.contract.exit_early();
    }

    fn finalize(&mut self, epoch: u64, timestamp: u64) {
        self.at(&user(9_000), NearToken::from_near(1), timestamp);
        self.contract.finalize_epoch(U64(epoch));
    }

    fn entry_close(&self, epoch: u64) -> u64 {
        self.genesis + epoch * self.duration + self.entry
    }

    fn epoch_end(&self, epoch: u64) -> u64 {
        self.genesis + (epoch + 1) * self.duration
    }

    fn assert_books(&self) {
        self.contract.assert_accounting();
        let supply = self.contract.ft_total_supply().0;
        let expected = INITIAL_SUPPLY + self.contract.total_graded_minted
            - self.contract.total_exit_burned
            - self.contract.total_reserve_burned
            - self.contract.total_dust_burned
            - self.contract.total_swept_burned;
        assert_eq!(supply, expected, "supply formula");
        assert_eq!(
            self.contract.get_protocol_balances().accounting_difference,
            "0"
        );
    }
}

fn logs_contain(fragment: &str) -> bool {
    get_logs().iter().any(|line| line.contains(fragment))
}

#[test]
fn init_sets_supply_metadata_and_immutable_config() {
    let demo = World::demo();
    assert!(logs_contain("ft_mint"));
    assert!(logs_contain("initial supply"));
    let metadata = demo.contract.ft_metadata();
    assert_eq!(metadata.spec, "ft-1.0.0");
    assert_eq!(metadata.name, "PAPERHANDS");
    assert_eq!(metadata.symbol, "PAPER");
    assert_eq!(metadata.decimals, 8);
    assert!(metadata.icon.is_none());
    assert_eq!(demo.contract.ft_total_supply().0, INITIAL_SUPPLY);
    let config = demo.contract.get_economic_config();
    assert_eq!(config.deployment_kind, "demo-testnet");
    assert_eq!(config.epoch_duration_ns, U64(DEMO_EPOCH_NS));
    assert_eq!(config.entry_window_ns, U64(DEMO_ENTRY_NS));
    assert!(config.faucet_enabled);
    assert!(!config.principal_claim_expires);
    assert_eq!(config.commitment, U128(COMMITMENT));
    assert_eq!(config.max_mint_per_epoch, U128(MAX_MINT_PER_EPOCH));
    assert_eq!(config.failed_epoch_reserve_burn, U128(FAILED_EPOCH_BURN));
    let balances = demo.contract.get_protocol_balances();
    assert_eq!(balances.contract_token_balance, U128(INITIAL_SUPPLY));
    assert_eq!(balances.faucet_reserve, U128(FAUCET_RESERVE));
    assert_eq!(balances.burn_reserve, U128(BURN_RESERVE));
    assert_eq!(balances.accounting_difference, "0");
    assert_eq!(balances.total_graded_minted, U128(0));
    let current = demo.contract.get_current_epoch();
    assert_eq!(current.phase, "entry");
    assert_eq!(current.epoch_id, U64(0));
    assert_eq!(current.deployment_kind, "demo-testnet");
    demo.assert_books();

    let production = World::production();
    let config = production.contract.get_economic_config();
    assert_eq!(config.deployment_kind, "production");
    assert_eq!(config.epoch_duration_ns, U64(PRODUCTION_EPOCH_NS));
    assert_eq!(config.entry_window_ns, U64(PRODUCTION_ENTRY_NS));
    assert!(!config.faucet_enabled);
    assert!(!production.contract.get_faucet_status(None).sybil_resistant);
}

#[test]
#[should_panic(expected = "deployment_kind must be production or demo-testnet")]
fn init_rejects_unknown_deployment_kind() {
    clear_storage();
    set_env(&contract_account(), NearToken::from_yoctonear(0), 1);
    let _ = Contract::new(
        U64(DEMO_EPOCH_NS),
        U64(DEMO_ENTRY_NS),
        true,
        "mainnet".into(),
    );
}

#[test]
#[should_panic(expected = "demo-testnet must use a 1 hour epoch")]
fn init_rejects_demo_labeled_as_seven_day() {
    clear_storage();
    set_env(&contract_account(), NearToken::from_yoctonear(0), 1);
    let _ = Contract::new(
        U64(PRODUCTION_EPOCH_NS),
        U64(PRODUCTION_ENTRY_NS),
        true,
        "demo-testnet".into(),
    );
}

#[test]
#[should_panic(expected = "production must use a 7 day epoch")]
fn init_rejects_production_with_faucet() {
    clear_storage();
    set_env(&contract_account(), NearToken::from_yoctonear(0), 1);
    let _ = Contract::new(
        U64(PRODUCTION_EPOCH_NS),
        U64(PRODUCTION_ENTRY_NS),
        true,
        "production".into(),
    );
}

#[test]
fn clocks_follow_the_deployment_duration() {
    let demo = World::demo();
    demo.at(
        &contract_account(),
        NearToken::from_yoctonear(0),
        demo.entry_close(0) - 1,
    );
    assert_eq!(demo.contract.get_current_epoch().phase, "entry");
    demo.at(
        &contract_account(),
        NearToken::from_yoctonear(0),
        demo.entry_close(0),
    );
    assert_eq!(demo.contract.get_current_epoch().phase, "commitment");
    demo.at(
        &contract_account(),
        NearToken::from_yoctonear(0),
        demo.epoch_end(0),
    );
    let current = demo.contract.get_current_epoch();
    assert_eq!(current.epoch_id, U64(1));
    assert_eq!(current.phase, "entry");

    let production = World::production();
    production.at(
        &contract_account(),
        NearToken::from_yoctonear(0),
        production.genesis + PRODUCTION_EPOCH_NS - 1,
    );
    assert_eq!(production.contract.get_current_epoch().epoch_id, U64(0));
    assert_eq!(production.contract.get_current_epoch().phase, "commitment");
    production.at(
        &contract_account(),
        NearToken::from_yoctonear(0),
        production.genesis + PRODUCTION_EPOCH_NS,
    );
    assert_eq!(production.contract.get_current_epoch().epoch_id, U64(1));
    assert_eq!(production.contract.get_current_epoch().phase, "entry");
}

#[test]
fn transfer_is_untaxed_and_rejects_bad_receivers() {
    let mut world = World::demo();
    let alice = user(0);
    let bob = user(1);
    world.register(&alice, world.genesis);
    world.register(&bob, world.genesis);
    world.fund(&alice, paper(100), world.genesis);
    let supply = world.contract.ft_total_supply().0;
    world.at(&alice, NearToken::from_yoctonear(1), world.genesis);
    world
        .contract
        .ft_transfer(bob.clone(), U128(paper(40)), None);
    assert_eq!(world.contract.ft_balance_of(alice.clone()).0, paper(60));
    assert_eq!(world.contract.ft_balance_of(bob).0, paper(40));
    assert_eq!(world.contract.ft_total_supply().0, supply);
    assert!(logs_contain("ft_transfer"));
    world.assert_books();
}

#[test]
#[should_panic(expected = "is not registered")]
fn transfer_to_unregistered_account_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.fund(&alice, paper(10), world.genesis);
    world.at(&alice, NearToken::from_yoctonear(1), world.genesis);
    world.contract.ft_transfer(user(2), U128(paper(1)), None);
}

#[test]
#[should_panic(expected = "transfers to the PAPERHANDS contract are rejected")]
fn transfer_to_the_contract_is_rejected() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.fund(&alice, paper(10), world.genesis);
    world.at(&alice, NearToken::from_yoctonear(1), world.genesis);
    world
        .contract
        .ft_transfer(contract_account(), U128(paper(1)), None);
}

#[test]
fn faucet_pays_once_from_reserve_and_is_not_sybil_proof() {
    let mut world = World::demo();
    let alice = user(0);
    let bob = user(1);
    world.register(&alice, world.genesis);
    world.register(&bob, world.genesis);
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
    assert!(logs_contain("faucet_claimed"));
    assert_eq!(world.contract.ft_balance_of(alice.clone()).0, FAUCET_AMOUNT);
    assert_eq!(
        world.contract.faucet_reserve,
        FAUCET_RESERVE - FAUCET_AMOUNT
    );
    assert_eq!(world.contract.ft_total_supply().0, INITIAL_SUPPLY);
    let status = world.contract.get_faucet_status(Some(alice.clone()));
    assert!(status.claimed.unwrap());
    assert!(!status.sybil_resistant);
    world.at(&bob, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
    assert_eq!(world.contract.ft_balance_of(bob).0, FAUCET_AMOUNT);
    world.assert_books();
}

#[test]
#[should_panic(expected = "faucet already claimed")]
fn faucet_rejects_a_second_claim() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
}

#[test]
#[should_panic(expected = "faucet is disabled")]
fn production_faucet_is_disabled() {
    let mut world = World::production();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
}

#[test]
fn faucet_cap_is_the_reserve() {
    let mut world = World::demo();
    let claims = u32::try_from(FAUCET_RESERVE / FAUCET_AMOUNT).unwrap();
    assert_eq!(claims, 700);
    for index in 0..claims {
        let account = user(index);
        world.register(&account, world.genesis);
        world.at(&account, NearToken::from_near(1), world.genesis);
        world.contract.claim_testnet_faucet();
    }
    assert_eq!(world.contract.faucet_reserve, 0);
    world.assert_books();
    let extra = user(claims);
    world.register(&extra, world.genesis);
    world.at(&extra, NearToken::from_near(1), world.genesis);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        world.contract.claim_testnet_faucet();
    }));
    assert!(result.is_err());
}

#[test]
fn join_locks_1000_and_cancel_refunds_without_penalty() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    assert_eq!(world.contract.ft_balance_of(alice.clone()).0, 0);
    assert_eq!(world.contract.locked_principal, COMMITMENT);
    assert!(logs_contain("epoch_joined"));
    assert!(logs_contain("commitment_locked"));
    let stats = world.contract.get_epoch_stats(U64(0));
    assert_eq!(stats.active_participants, 1);
    assert!(stats.original_participants.is_none());
    world.assert_books();

    world.cancel(&alice, world.genesis);
    assert_eq!(world.contract.ft_balance_of(alice.clone()).0, COMMITMENT);
    assert_eq!(world.contract.locked_principal, 0);
    assert_eq!(world.contract.ft_total_supply().0, INITIAL_SUPPLY);
    assert!(logs_contain("epoch_entry_cancelled"));
    let commitment = world.contract.get_commitment(U64(0), alice).unwrap();
    assert_eq!(commitment.status, CommitmentStatus::CancelledDuringEntry);
    world.assert_books();
}

#[test]
#[should_panic(expected = "account already joined or left this epoch")]
fn cancelled_account_cannot_rejoin() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.cancel(&alice, world.genesis);
    world.join(&alice, world.genesis);
}

#[test]
#[should_panic(expected = "account already joined or left this epoch")]
fn duplicate_join_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.fund(&alice, COMMITMENT, world.genesis);
    world.join(&alice, world.genesis);
}

#[test]
#[should_panic(expected = "entry window is closed")]
fn join_after_close_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.entry_close(0));
}

#[test]
#[should_panic(expected = "insufficient PAPER balance")]
fn join_without_tokens_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.join(&alice, world.genesis);
}

#[test]
#[should_panic(expected = "not registered")]
fn join_without_storage_registration_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.join_epoch();
}

#[test]
#[should_panic(expected = "insufficient storage deposit")]
fn join_with_only_one_yocto_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.fund(&alice, COMMITMENT, world.genesis);
    world.at(&alice, NearToken::from_yoctonear(1), world.genesis);
    world.contract.join_epoch();
}

#[test]
fn commitment_storage_is_measured() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    let bob = user(1);
    world.prepare(&bob, world.genesis);
    world.at(&alice, NearToken::from_near(1), world.genesis);
    let before_epoch = near_sdk::env::storage_usage();
    world.contract.join_epoch();
    let first_bytes = near_sdk::env::storage_usage() - before_epoch;
    world.at(&bob, NearToken::from_near(1), world.genesis);
    let before = near_sdk::env::storage_usage();
    world.contract.join_epoch();
    let bytes = near_sdk::env::storage_usage() - before;
    let cost = near_sdk::env::storage_byte_cost().saturating_mul(u128::from(bytes));
    println!("MEASURED_FIRST_JOIN_STORAGE_BYTES={first_bytes}");
    println!("MEASURED_COMMITMENT_STORAGE_BYTES={bytes}");
    println!("MEASURED_COMMITMENT_STORAGE_YOCTO={}", cost.as_yoctonear());
    assert!(bytes > 40 && bytes < 2_000, "unexpected storage {bytes}");
    assert!(
        first_bytes > bytes,
        "the first join also writes the epoch record"
    );
    world.assert_books();
}

#[test]
fn early_exit_is_950_25_25_and_only_during_commitment() {
    let mut world = World::demo();
    let alice = user(0);
    let bob = user(1);
    world.prepare(&alice, world.genesis);
    world.prepare(&bob, world.genesis);
    world.join(&alice, world.genesis);
    world.join(&bob, world.genesis);
    let split = early_exit_split(COMMITMENT);
    assert_eq!(split.returned, paper(950));
    assert_eq!(split.burned, paper(25));
    assert_eq!(split.bonus, paper(25));

    world.exit(&alice, world.entry_close(0));
    assert_eq!(world.contract.ft_balance_of(alice.clone()).0, paper(950));
    assert_eq!(world.contract.locked_principal, COMMITMENT);
    assert_eq!(world.contract.unclaimed_exit_bonuses, paper(25));
    assert_eq!(world.contract.total_exit_burned, paper(25));
    assert_eq!(
        world.contract.ft_total_supply().0,
        INITIAL_SUPPLY - paper(25)
    );
    assert!(logs_contain("early_exit"));
    assert!(logs_contain("early_exit_penalty_burn"));
    assert!(logs_contain("survivor_bonus_accrued"));
    assert!(logs_contain("epoch_entry_closed"));
    let stats = world.contract.get_epoch_stats(U64(0));
    assert_eq!(stats.original_participants, Some(2));
    assert_eq!(stats.active_participants, 1);
    assert_eq!(stats.early_exits, 1);
    let commitment = world.contract.get_commitment(U64(0), alice).unwrap();
    assert_eq!(commitment.status, CommitmentStatus::ExitedEarly);
    world.assert_books();
}

#[test]
#[should_panic(expected = "early exit opens after the entry window closes")]
fn early_exit_during_entry_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.exit(&alice, world.genesis);
}

#[test]
#[should_panic(expected = "epoch has ended")]
fn early_exit_after_epoch_end_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.exit(&alice, world.epoch_end(0));
}

#[test]
#[should_panic(expected = "commitment is not active")]
fn early_exit_cannot_be_repeated() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.exit(&alice, world.entry_close(0));
    world.exit(&alice, world.entry_close(0) + 1);
}

#[test]
fn retention_table_and_settlement_are_exact() {
    let rows = [
        (25_u32, 25_u32, true),
        (25, 22, true),
        (25, 20, true),
        (25, 19, false),
        (32, 26, true),
        (32, 25, false),
        (40, 32, true),
        (40, 30, false),
        (24, 24, false),
        (0, 0, false),
    ];
    for (original, survivors, success) in rows {
        assert_eq!(retention_succeeded(original, survivors), success);
        let mut world = World::demo();
        let exits = original - survivors;
        for index in 0..original {
            let account = user(index);
            world.prepare(&account, world.genesis);
            world.join(&account, world.genesis);
        }
        let exit_at = world.entry_close(0);
        for index in 0..exits {
            world.exit(&user(index), exit_at);
        }
        world.finalize(0, world.epoch_end(0));
        let detail = world.contract.get_epoch(U64(0));
        assert_eq!(detail.success, Some(success), "{original}/{survivors}");
        assert_eq!(detail.original_participants, Some(original));
        assert_eq!(detail.active_participants, survivors);
        assert_eq!(detail.finalized, true);
        let emission = graded_emission(original, survivors);
        assert_eq!(detail.minted.0, emission.minted);
        let bonus = split_bonus(paper(25) * u128::from(exits), survivors);
        assert_eq!(detail.bonus_per_survivor.0, bonus.per_survivor);
        assert_eq!(detail.dust_burned.0, bonus.dust);
        let reserve = if success { 0 } else { FAILED_EPOCH_BURN };
        assert_eq!(detail.reserve_burned.0, reserve);
        if success {
            assert_eq!(world.contract.get_current_streak(), 1);
            assert_eq!(world.contract.get_longest_streak(), 1);
        } else {
            assert_eq!(world.contract.get_current_streak(), 0);
            assert_eq!(world.contract.get_longest_streak(), 0);
        }
        world.assert_books();
    }
}

#[test]
fn graded_mint_cap_matches_the_table() {
    let rows = [
        (25_u32, 250_u128),
        (30, 300),
        (40, 400),
        (50, 500),
        (100, 500),
        (500, 500),
    ];
    for (survivors, minted_paper) in rows {
        let emission = graded_emission(survivors, survivors);
        assert_eq!(emission.minted, paper(minted_paper));
        assert_eq!(
            emission.per_survivor * u128::from(survivors),
            emission.minted
        );
        assert!(emission.minted <= MAX_MINT_PER_EPOCH);
    }
    assert_eq!(graded_emission(24, 24).minted, 0);
    assert_eq!(graded_emission(25, 0).minted, 0);
}

#[test]
fn max_participants_and_mint_cap_settle_in_one_epoch() {
    let mut world = World::demo();
    for index in 0..MAX_PARTICIPANTS {
        let account = user(index);
        world.prepare(&account, world.genesis);
        world.join(&account, world.genesis);
    }
    let overflow = user(MAX_PARTICIPANTS);
    world.prepare(&overflow, world.genesis);
    world.at(&overflow, NearToken::from_near(1), world.genesis);
    let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        world.contract.join_epoch();
    }));
    assert!(rejected.is_err());
    world.finalize(0, world.epoch_end(0));
    let detail = world.contract.get_epoch(U64(0));
    assert_eq!(detail.success, Some(true));
    assert_eq!(detail.minted.0, paper(500));
    assert_eq!(detail.reward_per_survivor.0, paper(1));
    assert_eq!(detail.reserve_burned.0, 0);
    world.assert_books();
}

#[test]
fn dust_zero_survivors_and_worked_example() {
    let dust = split_bonus(paper(250), 30);
    assert_eq!(
        dust.dust, 10,
        "250 PAPER among 30 survivors leaves 10 smallest units"
    );
    assert_eq!(dust.distributable + dust.dust, paper(250));

    let mut world = World::demo();
    for index in 0..40 {
        let account = user(index);
        world.prepare(&account, world.genesis);
        world.join(&account, world.genesis);
    }
    let exit_at = world.entry_close(0);
    for index in 0..10 {
        world.exit(&user(index), exit_at);
    }
    world.finalize(0, world.epoch_end(0));
    let detail = world.contract.get_epoch(U64(0));
    assert_eq!(detail.original_participants, Some(40));
    assert_eq!(detail.active_participants, 30);
    assert_eq!(detail.success, Some(false));
    assert_eq!(detail.minted.0, paper(300));
    assert_eq!(detail.dust_burned.0, 10);
    assert_eq!(detail.reserve_burned.0, FAILED_EPOCH_BURN);
    assert_eq!(world.contract.total_dust_burned, 10);
    world.assert_books();

    let mut empty_pool = World::demo();
    for index in 0..25 {
        let account = user(index);
        empty_pool.prepare(&account, empty_pool.genesis);
        empty_pool.join(&account, empty_pool.genesis);
    }
    let exit_at = empty_pool.entry_close(0);
    for index in 0..25 {
        empty_pool.exit(&user(index), exit_at);
    }
    empty_pool.finalize(0, empty_pool.epoch_end(0));
    let detail = empty_pool.contract.get_epoch(U64(0));
    assert_eq!(detail.active_participants, 0);
    assert_eq!(detail.minted.0, 0);
    assert_eq!(detail.dust_burned.0, paper(625));
    assert_eq!(detail.unclaimed_bonus_remaining.0, 0);
    empty_pool.assert_books();

    let mut worked = World::demo();
    for index in 0..32 {
        let account = user(index);
        worked.prepare(&account, worked.genesis);
        worked.join(&account, worked.genesis);
    }
    let exit_at = worked.entry_close(0);
    for index in 0..7 {
        worked.exit(&user(index), exit_at);
    }
    worked.finalize(0, worked.epoch_end(0));
    let detail = worked.contract.get_epoch(U64(0));
    assert_eq!(detail.success, Some(false));
    assert_eq!(detail.retention_bps, Some(7_812));
    assert_eq!(detail.minted.0, paper(250));
    assert_eq!(detail.reserve_burned.0, paper(250));
    assert_eq!(detail.bonus_per_survivor.0, paper(7));
    assert_eq!(detail.dust_burned.0, 0);
    assert_eq!(worked.contract.total_exit_burned, paper(175));
    assert_eq!(
        worked.contract.ft_total_supply().0,
        INITIAL_SUPPLY - paper(175)
    );
    let survivor = user(7);
    worked.at(&survivor, NearToken::from_yoctonear(1), worked.epoch_end(0));
    worked.contract.claim_epoch_rewards(U64(0));
    worked.contract.claim_principal(U64(0));
    assert_eq!(worked.contract.ft_balance_of(survivor).0, paper(1_017));
    let view = worked.contract.get_commitment(U64(0), user(8)).unwrap();
    assert_eq!(view.status, CommitmentStatus::Survivor);
    worked.assert_books();
}

#[test]
fn claims_expire_rewards_only_and_principal_survives_sweep() {
    let mut world = World::demo();
    for index in 0..25 {
        let account = user(index);
        world.prepare(&account, world.genesis);
        world.join(&account, world.genesis);
    }
    world.finalize(0, world.epoch_end(0));
    let survivor = user(0);
    let state = world
        .contract
        .get_user_epoch_state(U64(0), survivor.clone());
    assert!(state.principal_claim_open);
    assert!(state.rewards_claim_open);
    assert_eq!(state.claimable_principal.0, COMMITMENT);
    assert_eq!(state.claimable_mint.0, paper(10));
    world.at(&survivor, NearToken::from_yoctonear(1), world.epoch_end(0));
    world.contract.claim_epoch_rewards(U64(0));
    world.contract.claim_principal(U64(0));
    let claimed = world
        .contract
        .get_commitment(U64(0), survivor.clone())
        .unwrap();
    assert_eq!(claimed.status, CommitmentStatus::PrincipalClaimed);
    assert!(claimed.rewards_claimed);

    let deadline = world
        .contract
        .get_epoch(U64(0))
        .reward_claim_deadline_ns
        .unwrap()
        .0;
    world.at(&user(1), NearToken::from_yoctonear(1), deadline);
    let closed = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        world.contract.claim_epoch_rewards(U64(0));
    }));
    assert!(closed.is_err());
    world.at(&user(9_000), NearToken::from_near(1), deadline);
    world.contract.sweep_unclaimed_epoch_rewards(U64(0));
    assert!(logs_contain("unclaimed_rewards_swept"));
    let detail = world.contract.get_epoch(U64(0));
    assert!(detail.rewards_swept);
    assert_eq!(detail.unclaimed_mint_remaining.0, 0);
    assert_eq!(world.contract.locked_principal, 24 * COMMITMENT);
    world.at(&user(1), NearToken::from_yoctonear(1), deadline + 1);
    world.contract.claim_principal(U64(0));
    assert_eq!(world.contract.ft_balance_of(user(1)).0, COMMITMENT);
    world.assert_books();
}

#[test]
#[should_panic(expected = "epoch is not finalized")]
fn principal_before_finalization_fails() {
    let mut world = World::demo();
    let alice = user(0);
    world.prepare(&alice, world.genesis);
    world.join(&alice, world.genesis);
    world.at(&alice, NearToken::from_yoctonear(1), world.epoch_end(0));
    world.contract.claim_principal(U64(0));
}

#[test]
#[should_panic(expected = "rewards already claimed")]
fn rewards_cannot_be_claimed_twice() {
    let mut world = World::demo();
    let alice = user(0);
    for index in 0..25 {
        let account = user(index);
        world.prepare(&account, world.genesis);
        world.join(&account, world.genesis);
    }
    world.finalize(0, world.epoch_end(0));
    world.at(&alice, NearToken::from_yoctonear(1), world.epoch_end(0));
    world.contract.claim_epoch_rewards(U64(0));
    world.contract.claim_epoch_rewards(U64(0));
}

#[test]
fn streaks_survive_a_later_failure_and_empty_epochs_burn_reserve() {
    let mut world = World::demo();
    for index in 0..25 {
        let account = user(index);
        world.prepare(&account, world.genesis);
        world.join(&account, world.genesis);
    }
    world.finalize(0, world.epoch_end(0));
    assert_eq!(world.contract.get_current_streak(), 1);
    world.finalize(1, world.epoch_end(1));
    assert_eq!(world.contract.get_epoch(U64(1)).success, Some(false));
    assert_eq!(
        world.contract.get_epoch(U64(1)).original_participants,
        Some(0)
    );
    assert_eq!(
        world.contract.get_epoch(U64(1)).reserve_burned.0,
        FAILED_EPOCH_BURN
    );
    assert_eq!(world.contract.get_current_streak(), 0);
    assert_eq!(world.contract.get_longest_streak(), 1);
    world.assert_books();
}

#[test]
#[should_panic(expected = "epochs finalize in order; next epoch is 0")]
fn finalize_is_sequential() {
    let mut world = World::demo();
    world.finalize(1, world.epoch_end(1));
}

#[test]
#[should_panic(expected = "epoch has not ended")]
fn finalize_before_end_fails() {
    let mut world = World::demo();
    world.finalize(0, world.epoch_end(0) - 1);
}

#[test]
fn empty_burn_reserve_still_resets_the_streak() {
    let mut world = World::demo();
    let epochs = u32::try_from(BURN_RESERVE / FAILED_EPOCH_BURN).unwrap();
    assert_eq!(epochs, 1_200);
    for epoch in 0..epochs {
        let end = world.genesis + u64::from(epoch + 1) * world.duration;
        world.finalize(u64::from(epoch), end);
    }
    assert_eq!(world.contract.burn_reserve, 0);
    assert_eq!(
        world.contract.ft_total_supply().0,
        INITIAL_SUPPLY - BURN_RESERVE
    );
    world.assert_books();
    let end = world.genesis + u64::from(epochs + 1) * world.duration;
    world.finalize(u64::from(epochs), end);
    assert_eq!(
        world
            .contract
            .get_epoch(U64(u64::from(epochs)))
            .reserve_burned
            .0,
        0
    );
    assert_eq!(world.contract.get_current_streak(), 0);
    assert_eq!(
        world.contract.ft_total_supply().0,
        INITIAL_SUPPLY - BURN_RESERVE
    );
    world.assert_books();
}

#[test]
fn force_unregister_burns_only_liquid_tokens() {
    let mut world = World::demo();
    let alice = user(0);
    world.register(&alice, world.genesis);
    world.fund(&alice, paper(15), world.genesis);
    let supply = world.contract.ft_total_supply().0;
    world.at(&alice, NearToken::from_yoctonear(1), world.genesis);
    assert!(world.contract.storage_unregister(Some(true)));
    assert_eq!(world.contract.ft_balance_of(alice).0, 0);
    assert_eq!(world.contract.ft_total_supply().0, supply - paper(15));
    world.contract.assert_accounting();
}

#[test]
fn accounting_holds_across_the_whole_lifecycle() {
    let mut world = World::demo();
    let alice = user(0);
    let bob = user(1);
    let carol = user(2);
    world.register(&alice, world.genesis);
    world.assert_books();
    world.at(&alice, NearToken::from_near(1), world.genesis);
    world.contract.claim_testnet_faucet();
    world.assert_books();
    world.prepare(&bob, world.genesis);
    world.join(&bob, world.genesis);
    world.assert_books();
    world.cancel(&bob, world.genesis);
    world.assert_books();
    world.join(&alice, world.genesis);
    world.prepare(&carol, world.genesis + 1);
    world.join(&carol, world.genesis + 1);
    world.assert_books();
    world.exit(&carol, world.entry_close(0));
    world.assert_books();
    world.finalize(0, world.epoch_end(0));
    world.assert_books();
    world.at(&alice, NearToken::from_yoctonear(1), world.epoch_end(0));
    world.contract.claim_principal(U64(0));
    world.assert_books();
    let deadline = world
        .contract
        .get_epoch(U64(0))
        .reward_claim_deadline_ns
        .unwrap()
        .0;
    world.at(&user(9_000), NearToken::from_near(1), deadline);
    world.contract.sweep_unclaimed_epoch_rewards(U64(0));
    world.assert_books();
}
