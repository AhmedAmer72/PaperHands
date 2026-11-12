//! Local NEAR sandbox coverage. These tests deploy the wasm. They do not
//! touch public Testnet or Mainnet and they do not invent transaction hashes.
//!
//! The ten-row settlement table, the 30-day sweep, and the empty-reserve
//! streak reset live in the unit tests. A sandbox does not need to mine 30
//! days of blocks to prove those. This file checks the same rules on receipts:
//! metadata, transfers and the refund callback, the faucet, the 950/25/25
//! exit, dust, an empty epoch, a 25-person success, claims, and the calls
//! that must not exist.

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

fn wasm() -> &'static [u8] {
    static WASM: OnceLock<Vec<u8>> = OnceLock::new();
    WASM.get_or_init(|| {
        let opts = cargo_near_build::BuildOpts::builder()
            .no_wasmopt(true)
            .override_cargo_target_dir("target/near-wasm".to_string())
            .build();
        let path = cargo_near_build::build_with_cli(opts).expect("cargo near build");
        std::fs::read(path).expect("read wasm")
    })
}

fn signer() -> TestResult<Arc<Signer>> {
    Ok(Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY.parse()?,
    )?)
}

fn sandbox_id(name: &str) -> near_sdk::AccountId {
    name.parse().expect("account id")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a str {
    value[key]
        .as_str()
        .unwrap_or_else(|| panic!("{key} missing in {value}"))
}

struct Chain {
    sandbox: Sandbox,
    network: NetworkConfig,
    signer: Arc<Signer>,
    contract: Contract,
}

impl Chain {
    async fn deploy(name: &str, init: Value) -> TestResult<Self> {
        let sandbox = Sandbox::start_sandbox().await?;
        let network = NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);
        let signer = signer()?;
        let contract = deploy_on(&sandbox, &network, &signer, name, init).await?;
        Ok(Self {
            sandbox,
            network,
            signer,
            contract,
        })
    }

    async fn also(&self, name: &str, init: Value) -> TestResult<Contract> {
        deploy_on(&self.sandbox, &self.network, &self.signer, name, init).await
    }

    async fn account(&self, name: &str) -> TestResult<AccountId> {
        self.sandbox
            .create_account(sandbox_id(name))
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
            .gas(NearGas::from_tgas(200))
            .deposit(deposit)
            .with_signer(account.clone(), self.signer.clone())
            .send_to(&self.network)
            .await?)
    }

    async fn call_ok(
        &self,
        account: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> TestResult<()> {
        self.call(&self.contract, account, method, args, deposit)
            .await?
            .assert_success();
        Ok(())
    }

    async fn call_err(
        &self,
        account: &AccountId,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> TestResult<String> {
        let failure = self
            .call(&self.contract, account, method, args, deposit)
            .await?
            .assert_failure();
        Ok(failure.to_string())
    }

    async fn view_on(&self, contract: &Contract, method: &str, args: Value) -> TestResult<Value> {
        Ok(contract
            .call_function(method, args)
            .read_only()
            .fetch_from(&self.network)
            .await?
            .data)
    }

    async fn view(&self, method: &str, args: Value) -> TestResult<Value> {
        self.view_on(&self.contract, method, args).await
    }

    async fn balance(&self, account: &AccountId) -> TestResult<String> {
        let value = self
            .view("ft_balance_of", json!({"account_id": account}))
            .await?;
        Ok(value
            .as_str()
            .unwrap_or_else(|| panic!("balance {value}"))
            .to_string())
    }

    async fn supply_on(&self, contract: &Contract) -> TestResult<String> {
        let value = self.view_on(contract, "ft_total_supply", json!({})).await?;
        Ok(value
            .as_str()
            .unwrap_or_else(|| panic!("supply {value}"))
            .to_string())
    }

    async fn now_and_bounds(&self) -> TestResult<(u64, u64, u64)> {
        let epoch = self.view("get_current_epoch", json!({})).await?;
        Ok((
            field(&epoch, "now_ns").parse()?,
            field(&epoch, "entry_end_ns").parse()?,
            field(&epoch, "end_ns").parse()?,
        ))
    }

    async fn forward_to(&self, target: u64) -> TestResult<()> {
        let mut now =
            field(&self.view("get_current_epoch", json!({})).await?, "now_ns").parse::<u64>()?;
        if now >= target {
            return Ok(());
        }
        self.sandbox.fast_forward(1).await?;
        let next =
            field(&self.view("get_current_epoch", json!({})).await?, "now_ns").parse::<u64>()?;
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
            let advanced = field(&self.view("get_current_epoch", json!({})).await?, "now_ns")
                .parse::<u64>()?;
            assert!(advanced > now, "sandbox clock stalled at {now}");
            now = advanced;
        }
        Ok(())
    }
}

async fn deploy_on(
    sandbox: &Sandbox,
    network: &NetworkConfig,
    signer: &Arc<Signer>,
    name: &str,
    init: Value,
) -> TestResult<Contract> {
    sandbox
        .create_account(sandbox_id(name))
        .initial_balance(NearToken::from_near(80))
        .send()
        .await?;
    let id: AccountId = name.parse()?;
    let contract = Contract(id);
    Contract::deploy(contract.0.clone())
        .use_code(wasm().to_vec())
        .with_init_call("new", init)?
        .with_signer(signer.clone())
        .send_to(network)
        .await?
        .assert_success();
    Ok(contract)
}

fn demo_init() -> Value {
    json!({
        "epoch_duration_ns": "3600000000000",
        "entry_window_ns": "600000000000",
        "faucet_enabled": true,
        "deployment_kind": "demo-testnet"
    })
}

fn production_init() -> Value {
    json!({
        "epoch_duration_ns": "604800000000000",
        "entry_window_ns": "86400000000000",
        "faucet_enabled": false,
        "deployment_kind": "production"
    })
}

fn storage_near() -> NearToken {
    NearToken::from_near(1)
}

fn one_yocto() -> NearToken {
    NearToken::from_yoctonear(1)
}

async fn register_and_faucet(chain: &Chain, account: &AccountId) -> TestResult<()> {
    chain
        .call_ok(
            account,
            "storage_deposit",
            json!({"account_id": null, "registration_only": null}),
            storage_near(),
        )
        .await?;
    chain
        .call_ok(account, "claim_testnet_faucet", json!({}), storage_near())
        .await?;
    Ok(())
}

async fn books(chain: &Chain) -> TestResult<()> {
    let balances = chain.view("get_protocol_balances", json!({})).await?;
    assert_eq!(balances["accounting_difference"], "0", "{balances}");
    Ok(())
}

#[tokio::test]
async fn sandbox_token_penalty_and_claims() -> TestResult {
    let chain = Chain::deploy("demo.sandbox", demo_init()).await?;
    let metadata = chain.view("ft_metadata", json!({})).await?;
    assert_eq!(metadata["spec"], "ft-1.0.0");
    assert_eq!(metadata["name"], "PAPERHANDS");
    assert_eq!(metadata["symbol"], "PAPER");
    assert_eq!(metadata["decimals"], 8);
    assert!(metadata["icon"].is_null());
    assert_eq!(
        chain.supply_on(&chain.contract.clone()).await?,
        "100000000000000"
    );

    let config = chain.view("get_economic_config", json!({})).await?;
    assert_eq!(config["deployment_kind"], "demo-testnet");
    assert_eq!(config["epoch_duration_ns"], "3600000000000");
    assert_eq!(config["entry_window_ns"], "600000000000");
    assert_eq!(config["faucet_enabled"], true);
    assert_eq!(
        chain.view("get_faucet_status", json!({})).await?["sybil_resistant"],
        false
    );
    books(&chain).await?;

    let alice = chain.account("alice.sandbox").await?;
    let bob = chain.account("bob.sandbox").await?;
    let carol = chain.account("carol.sandbox").await?;
    let dave = chain.account("dave.sandbox").await?;
    let eve = chain.account("eve.sandbox").await?;
    register_and_faucet(&chain, &alice).await?;
    register_and_faucet(&chain, &bob).await?;
    register_and_faucet(&chain, &dave).await?;
    register_and_faucet(&chain, &eve).await?;
    assert_eq!(chain.balance(&alice).await?, units(1_000));
    assert_eq!(
        chain.supply_on(&chain.contract.clone()).await?,
        "100000000000000"
    );

    let second = chain
        .call_err(&alice, "claim_testnet_faucet", json!({}), storage_near())
        .await?;
    assert!(second.contains("faucet already claimed"), "{second}");

    let unregistered = chain
        .call_err(
            &alice,
            "ft_transfer",
            json!({"receiver_id": carol, "amount": units(1), "memo": null}),
            one_yocto(),
        )
        .await?;
    assert!(unregistered.contains("not registered"), "{unregistered}");

    chain
        .call_ok(
            &alice,
            "ft_transfer",
            json!({"receiver_id": bob, "amount": units(1), "memo": "untaxed"}),
            one_yocto(),
        )
        .await?;
    assert_eq!(chain.balance(&alice).await?, units(999));
    assert_eq!(chain.balance(&bob).await?, units(1_001));
    assert_eq!(
        chain.supply_on(&chain.contract.clone()).await?,
        "100000000000000"
    );

    let donated = chain
        .call_err(
            &alice,
            "ft_transfer",
            json!({"receiver_id": chain.contract.0, "amount": units(1), "memo": null}),
            one_yocto(),
        )
        .await?;
    assert!(
        donated.contains("transfers to the PAPERHANDS contract are rejected"),
        "{donated}"
    );

    chain
        .call_ok(
            &alice,
            "ft_transfer_call",
            json!({"receiver_id": bob, "amount": units(1), "memo": null, "msg": "no receiver"}),
            one_yocto(),
        )
        .await?;
    assert_eq!(
        chain.balance(&alice).await?,
        units(999),
        "failed ft_transfer_call refunds"
    );
    assert_eq!(chain.balance(&bob).await?, units(1_001));

    let short = chain
        .call_err(&alice, "join_epoch", json!({}), storage_near())
        .await?;
    assert!(short.contains("insufficient PAPER"), "{short}");

    chain
        .call_ok(&dave, "join_epoch", json!({}), storage_near())
        .await?;
    chain
        .call_ok(&eve, "join_epoch", json!({}), storage_near())
        .await?;
    assert_eq!(chain.balance(&dave).await?, "0");
    let early = chain
        .call_err(&dave, "exit_early", json!({}), storage_near())
        .await?;
    assert!(
        early.contains("early exit opens after the entry window closes"),
        "{early}"
    );
    let premature = chain
        .call_err(
            &dave,
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    assert!(premature.contains("epoch has not ended"), "{premature}");
    let skipped = chain
        .call_err(
            &dave,
            "finalize_epoch",
            json!({"epoch_id": "1"}),
            storage_near(),
        )
        .await?;
    assert!(skipped.contains("epochs finalize in order"), "{skipped}");

    let (_, entry_end, end) = chain.now_and_bounds().await?;
    chain.forward_to(entry_end).await?;
    chain
        .call_ok(&dave, "exit_early", json!({}), storage_near())
        .await?;
    assert_eq!(chain.balance(&dave).await?, units(950));
    let repeat = chain
        .call_err(&dave, "exit_early", json!({}), storage_near())
        .await?;
    assert!(repeat.contains("commitment is not active"), "{repeat}");
    books(&chain).await?;

    chain.forward_to(end).await?;
    let late = chain
        .call_err(&eve, "exit_early", json!({}), storage_near())
        .await?;
    assert!(late.contains("epoch has ended"), "{late}");
    chain
        .call_ok(
            &alice,
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    let again = chain
        .call_err(
            &alice,
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    assert!(
        again.contains("epochs finalize in order") || again.contains("already finalized"),
        "{again}"
    );

    let detail = chain.view("get_epoch", json!({"epoch_id": "0"})).await?;
    assert_eq!(detail["original_participants"], 2);
    assert_eq!(detail["active_participants"], 1);
    assert_eq!(detail["early_exits"], 1);
    assert_eq!(detail["success"], false);
    assert_eq!(detail["minted"], "0");
    assert_eq!(detail["exit_burned"], units(25));
    assert_eq!(detail["reserve_burned"], units(250));
    assert_eq!(detail["bonus_per_survivor"], units(25));
    assert_eq!(detail["dust_burned"], "0");
    let eve_commitment = chain
        .view(
            "get_commitment",
            json!({"epoch_id": "0", "account_id": eve}),
        )
        .await?;
    assert_eq!(eve_commitment["status"], "Survivor");
    assert_eq!(eve_commitment["stored_status"], "Active");

    let before = chain
        .call_err(
            &eve,
            "claim_principal",
            json!({"epoch_id": "1"}),
            storage_near(),
        )
        .await?;
    assert!(
        before.contains("not finalized") || before.contains("only an unclaimed survivor"),
        "{before}"
    );
    chain
        .call_ok(
            &eve,
            "claim_epoch_rewards",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    chain
        .call_ok(
            &eve,
            "claim_principal",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    assert_eq!(chain.balance(&eve).await?, units(1_025));
    let dave_claim = chain
        .call_err(
            &dave,
            "claim_principal",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    assert!(
        dave_claim.contains("only an unclaimed survivor"),
        "{dave_claim}"
    );
    let missing = chain
        .call_err(&alice, "set_config", json!({}), one_yocto())
        .await?;
    assert!(
        missing.contains("MethodNotFound") || missing.to_lowercase().contains("method"),
        "{missing}"
    );
    let upgrade = chain
        .call_err(&alice, "upgrade", json!({}), one_yocto())
        .await?;
    assert!(
        upgrade.contains("MethodNotFound") || upgrade.to_lowercase().contains("method"),
        "{upgrade}"
    );
    books(&chain).await?;
    let supply = chain.supply_on(&chain.contract.clone()).await?;
    assert_eq!(
        supply,
        (100_000_000_000_000u128 - units(275).parse::<u128>()?).to_string()
    );
    Ok(())
}

#[tokio::test]
async fn sandbox_empty_epoch_and_demo_clock() -> TestResult {
    let chain = Chain::deploy("clock.sandbox", demo_init()).await?;
    let production = chain.also("prod.sandbox", production_init()).await?;
    let empty = chain.also("empty.sandbox", demo_init()).await?;
    let anyone = chain.account("anyone.sandbox").await?;

    let production_config = chain
        .view_on(&production, "get_economic_config", json!({}))
        .await?;
    assert_eq!(production_config["deployment_kind"], "production");
    assert_eq!(production_config["epoch_duration_ns"], "604800000000000");
    assert_eq!(production_config["faucet_enabled"], false);
    let faucet = chain
        .call(
            &production,
            &anyone,
            "claim_testnet_faucet",
            json!({}),
            storage_near(),
        )
        .await?
        .assert_failure()
        .to_string();
    assert!(faucet.contains("faucet is disabled"), "{faucet}");

    let demo_end: u64 =
        field(&chain.view("get_current_epoch", json!({})).await?, "end_ns").parse()?;
    let empty_end: u64 = field(
        &chain
            .view_on(&empty, "get_current_epoch", json!({}))
            .await?,
        "end_ns",
    )
    .parse()?;
    chain.forward_to(demo_end.max(empty_end)).await?;

    let demo_now = chain.view("get_current_epoch", json!({})).await?;
    let production_now = chain
        .view_on(&production, "get_current_epoch", json!({}))
        .await?;
    assert!(
        field(&demo_now, "epoch_id").parse::<u64>()? >= 1,
        "demo epoch should have rolled, {demo_now}"
    );
    assert_eq!(
        field(&production_now, "epoch_id"),
        "0",
        "a 7 day production epoch is still epoch 0"
    );
    assert_eq!(production_now["deployment_kind"], "production");
    assert_ne!(demo_now["deployment_kind"], "production");

    chain
        .call(
            &empty,
            &anyone,
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?
        .assert_success();
    let detail = chain
        .view_on(&empty, "get_epoch", json!({"epoch_id": "0"}))
        .await?;
    assert_eq!(detail["original_participants"], 0);
    assert_eq!(detail["active_participants"], 0);
    assert_eq!(detail["success"], false);
    assert_eq!(detail["minted"], "0");
    assert_eq!(detail["reserve_burned"], units(250));
    assert_eq!(
        chain
            .view_on(&empty, "get_current_streak", json!({}))
            .await?,
        0
    );
    let supply = chain.supply_on(&empty).await?;
    assert_eq!(
        supply,
        (100_000_000_000_000u128 - units(250).parse::<u128>()?).to_string()
    );
    let balances = chain
        .view_on(&empty, "get_protocol_balances", json!({}))
        .await?;
    assert_eq!(balances["accounting_difference"], "0", "{balances}");
    let repeat = chain
        .call(
            &empty,
            &anyone,
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?
        .assert_failure()
        .to_string();
    assert!(repeat.contains("epochs finalize in order"), "{repeat}");
    Ok(())
}

#[tokio::test]
async fn sandbox_success_cohort_and_dust() -> TestResult {
    let chain = Chain::deploy("cohort.sandbox", demo_init()).await?;
    let mut cohort = Vec::new();
    for index in 0..25 {
        let account = chain.account(&format!("p{index}.sandbox")).await?;
        register_and_faucet(&chain, &account).await?;
        chain
            .call_ok(&account, "join_epoch", json!({}), storage_near())
            .await?;
        cohort.push(account);
    }
    let (_, _, end) = chain.now_and_bounds().await?;
    chain.forward_to(end).await?;
    chain
        .call_ok(
            &cohort[0],
            "finalize_epoch",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    let detail = chain.view("get_epoch", json!({"epoch_id": "0"})).await?;
    assert_eq!(detail["original_participants"], 25);
    assert_eq!(detail["active_participants"], 25);
    assert_eq!(detail["success"], true);
    assert_eq!(detail["minted"], units(250));
    assert_eq!(detail["reward_per_survivor"], units(10));
    assert_eq!(detail["reserve_burned"], "0");
    assert_eq!(chain.view("get_current_streak", json!({})).await?, 1);
    chain
        .call_ok(
            &cohort[0],
            "claim_epoch_rewards",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    chain
        .call_ok(
            &cohort[0],
            "claim_principal",
            json!({"epoch_id": "0"}),
            storage_near(),
        )
        .await?;
    assert_eq!(chain.balance(&cohort[0]).await?, units(1_010));
    books(&chain).await?;

    let current = chain.view("get_current_epoch", json!({})).await?;
    assert_eq!(
        current["phase"], "entry",
        "epoch 1 entry should still be open, {current}"
    );
    let mut small = Vec::new();
    for index in 0..4 {
        let account = chain.account(&format!("q{index}.sandbox")).await?;
        register_and_faucet(&chain, &account).await?;
        chain
            .call_ok(&account, "join_epoch", json!({}), storage_near())
            .await?;
        small.push(account);
    }
    let (_, entry_end, end) = chain.now_and_bounds().await?;
    chain.forward_to(entry_end).await?;
    chain
        .call_ok(&small[0], "exit_early", json!({}), storage_near())
        .await?;
    assert_eq!(chain.balance(&small[0]).await?, units(950));
    chain.forward_to(end).await?;
    chain
        .call_ok(
            &small[1],
            "finalize_epoch",
            json!({"epoch_id": "1"}),
            storage_near(),
        )
        .await?;
    let dust = chain.view("get_epoch", json!({"epoch_id": "1"})).await?;
    assert_eq!(dust["original_participants"], 4);
    assert_eq!(dust["active_participants"], 3);
    assert_eq!(dust["success"], false);
    assert_eq!(dust["minted"], "0");
    assert_eq!(dust["reserve_burned"], units(250));
    assert_eq!(dust["bonus_per_survivor"], "833333333");
    assert_eq!(dust["dust_burned"], "1");
    chain
        .call_ok(
            &small[1],
            "claim_epoch_rewards",
            json!({"epoch_id": "1"}),
            storage_near(),
        )
        .await?;
    chain
        .call_ok(
            &small[1],
            "claim_principal",
            json!({"epoch_id": "1"}),
            storage_near(),
        )
        .await?;
    assert_eq!(chain.balance(&small[1]).await?, "100833333333");
    assert_eq!(chain.view("get_current_streak", json!({})).await?, 0);
    assert_eq!(chain.view("get_longest_streak", json!({})).await?, 1);
    books(&chain).await?;
    let supply = chain.supply_on(&chain.contract.clone()).await?;
    assert_eq!(supply, "99997499999999");
    Ok(())
}
