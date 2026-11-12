//! Cross-contract checks against the real PAPER wasm. Unit tests cover the
//! cohort math. This file checks that NEP-141 transfers, a failed transfer,
//! and a 25-account success actually move PAPER.

use std::sync::{Arc, OnceLock};

use near_api::types::transaction::result::TransactionResult;
use near_api::{AccountId, Contract, NearGas, NearToken, NetworkConfig, Signer};
use near_sandbox::Sandbox;
use near_sdk::serde_json::{Value, json};
use testresult::TestResult;

const ONE: u128 = 100_000_000;

fn units(whole: u128) -> String {
    (whole * ONE).to_string()
}

fn wasm(manifest: &str, target: &str) -> &'static [u8] {
    static PAPER: OnceLock<Vec<u8>> = OnceLock::new();
    static HUB: OnceLock<Vec<u8>> = OnceLock::new();
    let cell = if manifest.contains("paperhands") { &PAPER } else { &HUB };
    cell.get_or_init(|| {
        let opts = cargo_near_build::BuildOpts::builder()
            .manifest_path(manifest)
            .no_wasmopt(true)
            .override_cargo_target_dir(target.to_string())
            .build();
        let path = cargo_near_build::build_with_cli(opts).expect("cargo near build");
        std::fs::read(path).expect("read wasm")
    })
    .as_slice()
}

fn signer() -> TestResult<Arc<Signer>> {
    Ok(Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?)
}

struct Chain {
    sandbox: Sandbox,
    network: NetworkConfig,
    signer: Arc<Signer>,
    paper: Contract,
    hub: Contract,
}

impl Chain {
    async fn deploy() -> TestResult<Self> {
        let sandbox = Sandbox::start_sandbox().await?;
        let network = NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
        let signer = signer()?;
        let paper = deploy_code(
            &sandbox,
            &network,
            &signer,
            "paper.sandbox",
            wasm("../paperhands/Cargo.toml", "target/near-wasm-paper"),
            json!({
                "epoch_duration_ns": "3600000000000",
                "entry_window_ns": "600000000000",
                "faucet_enabled": true,
                "deployment_kind": "demo-testnet"
            }),
            NearToken::from_yoctonear(0),
        )
        .await?;
        let hub = deploy_code(
            &sandbox,
            &network,
            &signer,
            "hub.sandbox",
            wasm("Cargo.toml", "target/near-wasm-hub"),
            json!({
                "paper_token": "paper.sandbox",
                "deployment_kind": "demo-testnet",
                "pauser": "pauser.sandbox",
                "token_proposer": "proposer.sandbox",
                "token_approver": "approver.sandbox"
            }),
            NearToken::from_near(2),
        )
        .await?;
        Ok(Self {
            sandbox,
            network,
            signer,
            paper,
            hub,
        })
    }

    async fn account(&self, name: &str) -> TestResult<AccountId> {
        self.sandbox
            .create_account(name.parse()?)
            .initial_balance(NearToken::from_near(20))
            .send()
            .await?;
        Ok(name.parse()?)
    }

    async fn call(
        &self,
        contract: &Contract,
        account: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> TestResult<TransactionResult> {
        Ok(contract
            .call_function(method, args)
            .transaction()
            .gas(NearGas::from_tgas(280))
            .deposit(deposit)
            .with_signer(account.clone(), self.signer.clone())
            .send_to(&self.network)
            .await?)
    }

    async fn call_ok(
        &self,
        contract: &Contract,
        account: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> TestResult<()> {
        self.call(contract, account, method, args, deposit)
            .await?
            .assert_success();
        Ok(())
    }

    async fn call_err(
        &self,
        contract: &Contract,
        account: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> TestResult<String> {
        Ok(self
            .call(contract, account, method, args, deposit)
            .await?
            .assert_failure()
            .to_string())
    }

    async fn view(&self, contract: &Contract, method: &str, args: Value) -> TestResult<Value> {
        Ok(contract
            .call_function(method, args)
            .read_only()
            .fetch_from(&self.network)
            .await?
            .data)
    }

    async fn balance(&self, account: &AccountId) -> TestResult<String> {
        let value = self
            .view(&self.paper, "ft_balance_of", json!({"account_id": account}))
            .await?;
        Ok(value.as_str().unwrap_or_else(|| panic!("{value}")).to_string())
    }

    async fn register_and_faucet(&self, account: &AccountId) -> TestResult<()> {
        self.call_ok(
            &self.paper,
            account,
            "storage_deposit",
            json!({"account_id": null, "registration_only": null}),
            NearToken::from_near(1),
        )
        .await?;
        self.call_ok(
            &self.paper,
            account,
            "claim_testnet_faucet",
            json!({}),
            NearToken::from_near(1),
        )
        .await?;
        Ok(())
    }

    async fn forward_to(&self, target: u64) -> TestResult<()> {
        let mut now = self.now().await?;
        if now >= target {
            return Ok(());
        }
        self.sandbox.fast_forward(1).await?;
        let next = self.now().await?;
        let per_block = next.saturating_sub(now).max(1);
        now = next;
        while now < target {
            let remaining = target - now;
            let blocks = if remaining < per_block.saturating_mul(30) {
                1
            } else {
                (remaining / per_block).clamp(1, 5_000)
            };
            self.sandbox.fast_forward(blocks).await?;
            let advanced = self.now().await?;
            assert!(advanced > now, "sandbox clock stalled at {now}");
            now = advanced;
        }
        Ok(())
    }

    async fn now(&self) -> TestResult<u64> {
        let epoch = self.view(&self.paper, "get_current_epoch", json!({})).await?;
        Ok(epoch["now_ns"].as_str().unwrap().parse()?)
    }
}

async fn deploy_code(
    sandbox: &Sandbox,
    network: &NetworkConfig,
    signer: &Arc<Signer>,
    name: &str,
    code: &[u8],
    init: Value,
    deposit: NearToken,
) -> TestResult<Contract> {
    sandbox
        .create_account(name.parse()?)
        .initial_balance(NearToken::from_near(40))
        .send()
        .await?;
    let id: AccountId = name.parse()?;
    let contract = Contract(id);
    Contract::deploy(contract.0.clone())
        .use_code(code.to_vec())
        .with_init_call("new", init)?
        .deposit(deposit)
        .with_signer(signer.clone())
        .send_to(network)
        .await?
        .assert_success();
    Ok(contract)
}

#[tokio::test]
async fn sandbox_failed_transfer_and_successful_cohort() -> TestResult {
    let chain = Chain::deploy().await?;
    let sponsor = chain.account("sponsor.sandbox").await?;
    let patron = chain.account("patron.sandbox").await?;
    chain
        .call_ok(
            &chain.paper,
            &chain.hub.0,
            "storage_deposit",
            json!({"account_id": chain.hub.0, "registration_only": true}),
            NearToken::from_near(1),
        )
        .await?;
    chain.register_and_faucet(&sponsor).await?;
    chain.register_and_faucet(&patron).await?;
    assert_eq!(chain.balance(&sponsor).await?, units(1_000));

    chain
        .call_ok(
            &chain.hub,
            &sponsor,
            "create_campaign",
            json!({
                "name": "Cancel drill",
                "description": "Entry cancel returns the full lock.",
                "link": "https://example.com/cancel",
                "reward_amount": units(1_000),
                "min_original": 25,
                "target_retention_bps": 8000,
                "participant_cap": 25
            }),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.paper,
            &sponsor,
            "ft_transfer_call",
            json!({
                "receiver_id": chain.hub.0,
                "amount": units(1_000),
                "memo": null,
                "msg": r#"{"action":"fund_reward","campaign_id":1}"#
            }),
            NearToken::from_yoctonear(1),
        )
        .await?;
    assert_eq!(chain.balance(&sponsor).await?, "0");
    chain
        .call_ok(
            &chain.hub,
            &sponsor,
            "open_campaign",
            json!({"campaign_id": "1"}),
            NearToken::from_yoctonear(1),
        )
        .await?;

    let alice = chain.account("alice.sandbox").await?;
    chain.register_and_faucet(&alice).await?;
    chain
        .call_ok(
            &chain.paper,
            &alice,
            "ft_transfer_call",
            json!({
                "receiver_id": chain.hub.0,
                "amount": units(1_000),
                "memo": null,
                "msg": r#"{"action":"join","campaign_id":1}"#
            }),
            NearToken::from_yoctonear(1),
        )
        .await?;
    assert_eq!(chain.balance(&alice).await?, "0");
    chain
        .call_ok(
            &chain.hub,
            &alice,
            "cancel_join",
            json!({"campaign_id": "1"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    let removed = chain
        .call_ok(
            &chain.paper,
            &alice,
            "storage_unregister",
            json!({"force": true}),
            NearToken::from_yoctonear(1),
        )
        .await;
    assert!(removed.is_ok(), "{removed:?}");
    chain
        .call_ok(
            &chain.hub,
            &alice,
            "claim_principal",
            json!({"campaign_id": "1"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    let still = chain
        .view(
            &chain.hub,
            "get_participant",
            json!({"campaign_id": "1", "account_id": alice}),
        )
        .await?;
    assert_eq!(still["principal_available"], units(1_000), "{still}");
    assert_eq!(still["principal_pending"], false, "{still}");
    chain
        .call_ok(
            &chain.paper,
            &alice,
            "storage_deposit",
            json!({"account_id": null, "registration_only": null}),
            NearToken::from_near(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &alice,
            "claim_principal",
            json!({"campaign_id": "1"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    assert_eq!(chain.balance(&alice).await?, units(1_000));

    let forged = chain
        .call_err(
            &chain.hub,
            &alice,
            "ft_on_transfer",
            json!({"sender_id": alice, "amount": units(1), "msg": r#"{"action":"join","campaign_id":1}"#}),
            NearToken::from_yoctonear(0),
        )
        .await?;
    assert!(forged.contains("token contract is not PAPER"), "{forged}");

    chain
        .call_ok(
            &chain.hub,
            &patron,
            "create_campaign",
            json!({
                "name": "Cohort 25",
                "description": "Independent sponsor lock. Not a Core commitment.",
                "link": "",
                "reward_amount": units(1_000),
                "min_original": 25,
                "target_retention_bps": 8000,
                "participant_cap": 25
            }),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.paper,
            &patron,
            "ft_transfer_call",
            json!({
                "receiver_id": chain.hub.0,
                "amount": units(1_000),
                "memo": null,
                "msg": r#"{"action":"fund_reward","campaign_id":2}"#
            }),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &patron,
            "open_campaign",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;

    let mut people = vec![alice.clone()];
    for index in 1..25 {
        let account = chain.account(&format!("user{index}.sandbox")).await?;
        chain.register_and_faucet(&account).await?;
        people.push(account);
    }
    for account in &people {
        chain
            .call_ok(
                &chain.paper,
                account,
                "ft_transfer_call",
                json!({
                    "receiver_id": chain.hub.0,
                    "amount": units(1_000),
                    "memo": null,
                    "msg": r#"{"action":"join","campaign_id":2}"#
                }),
                NearToken::from_yoctonear(1),
            )
            .await?;
    }
    let opened = chain
        .view(&chain.hub, "get_campaign", json!({"campaign_id": "2"}))
        .await?;
    chain.forward_to(opened["entry_end_ns"].as_str().unwrap().parse()?).await?;
    chain
        .call_ok(
            &chain.hub,
            &patron,
            "activate_campaign",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &people[24],
            "exit_early",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &people[24],
            "claim_principal",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    assert_eq!(chain.balance(&people[24]).await?, units(950));
    let ended = chain
        .view(&chain.hub, "get_campaign", json!({"campaign_id": "2"}))
        .await?;
    chain
        .forward_to(ended["campaign_end_ns"].as_str().unwrap().parse()?)
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &sponsor,
            "finalize_campaign",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    let settled = chain
        .view(&chain.hub, "get_campaign", json!({"campaign_id": "2"}))
        .await?;
    assert_eq!(settled["state"], "FinalizedSuccess", "{settled}");
    assert_eq!(settled["original_participants"], 25, "{settled}");
    assert_eq!(settled["active_participants"], 24, "{settled}");
    assert_eq!(settled["early_exit_is_burn"], false, "{settled}");
    let books = chain
        .view(&chain.hub, "get_campaign_accounting", json!({"campaign_id": "2"}))
        .await?;
    assert_eq!(books["accounting_difference"], "0", "{books}");
    chain
        .call_ok(
            &chain.hub,
            &people[0],
            "claim_principal",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    chain
        .call_ok(
            &chain.hub,
            &people[0],
            "claim_sponsor_reward",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    let share = settled["sponsor_share"].as_str().unwrap().parse::<u128>()?;
    let balance = chain.balance(&people[0]).await?.parse::<u128>()?;
    assert_eq!(balance, 1_000 * ONE + share);
    let after = chain
        .view(&chain.hub, "get_campaign_accounting", json!({"campaign_id": "2"}))
        .await?;
    assert_eq!(after["accounting_difference"], "0", "{after}");

    let again = chain
        .call_err(
            &chain.hub,
            &people[0],
            "claim_principal",
            json!({"campaign_id": "2"}),
            NearToken::from_yoctonear(1),
        )
        .await?;
    assert!(again.contains("no principal to claim"), "{again}");
    Ok(())
}
