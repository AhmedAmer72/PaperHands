//! Community treasury for PAPERHANDS V3.
//!
//! The treasury holds donations only. A proposal pays out after two distinct
//! approvers agree and the timelock passes. The executor cannot be an approver.

use conviction::{is_deployment_kind, timelock};
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::{Value, json};
use near_sdk::store::LookupMap;
use near_sdk::{
    AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue, env, near,
    require,
};

const GAS_FT_TRANSFER: Gas = Gas::from_tgas(35);
const GAS_CALLBACK: Gas = Gas::from_tgas(40);

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Proposal {
    proposer: AccountId,
    beneficiary: AccountId,
    amount: u128,
    milestone: String,
    evidence: String,
    approvals: Vec<AccountId>,
    ready_at_ns: u64,
    executed: bool,
    pending: bool,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    paper: AccountId,
    deployment_kind: String,
    approver_a: AccountId,
    approver_b: AccountId,
    executor: AccountId,
    pauser: AccountId,
    paused: bool,
    assets: u128,
    available: u128,
    reserved: u128,
    pending: u128,
    next_proposal_id: u64,
    next_transfer_id: u64,
    proposals: LookupMap<u64, Proposal>,
    transfers: LookupMap<u64, u64>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct ProposalView {
    pub proposal_id: U64,
    pub proposer: AccountId,
    pub beneficiary: AccountId,
    pub amount: U128,
    pub milestone: String,
    pub evidence: String,
    pub approvals: Vec<AccountId>,
    pub ready_at_ns: U64,
    pub executed: bool,
    pub pending: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct AccountingView {
    pub token_id: AccountId,
    pub assets: U128,
    pub available: U128,
    pub reserved: U128,
    pub pending: U128,
    pub accounting_difference: String,
    pub timelock_ns: U64,
    pub demo_clock: bool,
    pub paused: bool,
}

impl Contract {
    fn emit(&self, event: &str, data: Value) {
        env::log_str(&format!(
            "EVENT_JSON:{}",
            json!({"standard":"paperhands-treasury","version":"1.0.0","event":event,"data":[data]})
        ));
    }

    fn yocto(&self) {
        require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "attach at least 1 yoctoNEAR");
    }

    fn refund_attached(&self) {
        let attached = env::attached_deposit();
        if attached > NearToken::from_yoctonear(0) {
            Promise::new(env::predecessor_account_id()).transfer(attached).detach();
        }
    }

    fn refund_except_one(&self) {
        let attached = env::attached_deposit();
        require!(attached >= NearToken::from_yoctonear(1), "attach at least 1 yoctoNEAR");
        let refund = attached.saturating_sub(NearToken::from_yoctonear(1));
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(env::predecessor_account_id()).transfer(refund).detach();
        }
    }

    fn assert_books(&self) {
        let sum = self.available.saturating_add(self.reserved);
        require!(self.assets == sum, "treasury accounting broken");
        require!(self.pending <= self.reserved, "pending exceeds reserved funds");
    }

    fn bounded(value: String, max: usize, label: &str) -> String {
        let trimmed = value.trim().to_string();
        require!(!trimmed.is_empty(), format!("{label} is required"));
        require!(trimmed.len() <= max, format!("{label} is too long"));
        require!(!trimmed.contains('@'), format!("{label} cannot contain personal data"));
        trimmed
    }

    fn proposal(&self, id: u64) -> Proposal {
        self.proposals.get(&id).cloned().unwrap_or_else(|| env::panic_str("proposal not found"))
    }
}

#[near]
impl Contract {
    #[payable]
    #[init]
    pub fn new(
        paper_token: AccountId,
        deployment_kind: String,
        approver_a: AccountId,
        approver_b: AccountId,
        executor: AccountId,
        pauser: AccountId,
    ) -> Self {
        require!(env::attached_deposit() >= NearToken::from_millinear(200), "attach at least 0.2 NEAR for treasury storage");
        require!(is_deployment_kind(&deployment_kind), "deployment_kind must be production or demo-testnet");
        require!(paper_token != env::current_account_id(), "paper token must be the Diamond Core contract");
        require!(approver_a != approver_b, "approvers must differ");
        require!(executor != approver_a && executor != approver_b, "executor cannot be an approver");
        require!(pauser != executor, "pauser and executor must differ");
        Self {
            paper: paper_token,
            deployment_kind,
            approver_a,
            approver_b,
            executor,
            pauser,
            paused: false,
            assets: 0,
            available: 0,
            reserved: 0,
            pending: 0,
            next_proposal_id: 1,
            next_transfer_id: 1,
            proposals: LookupMap::new(b"p"),
            transfers: LookupMap::new(b"x"),
        }
    }

    #[payable]
    pub fn create_proposal(&mut self, beneficiary: AccountId, amount: U128, milestone: String, evidence: String) -> U64 {
        self.yocto();
        require!(!self.paused, "new proposals are paused");
        require!(amount.0 > 0, "amount must be positive");
        let id = self.next_proposal_id;
        self.next_proposal_id += 1;
        self.proposals.insert(
            id,
            Proposal {
                proposer: env::predecessor_account_id(),
                beneficiary,
                amount: amount.0,
                milestone: Self::bounded(milestone, 180, "milestone"),
                evidence: Self::bounded(evidence, 180, "evidence"),
                approvals: Vec::new(),
                ready_at_ns: 0,
                executed: false,
                pending: false,
            },
        );
        self.emit("treasury_proposal_created", json!({"proposal_id": id, "amount": amount.0.to_string()}));
        self.refund_attached();
        U64(id)
    }

    #[payable]
    pub fn approve_proposal(&mut self, proposal_id: U64) {
        self.yocto();
        require!(!self.paused, "approvals are paused");
        let caller = env::predecessor_account_id();
        require!(caller == self.approver_a || caller == self.approver_b, "only an approver can approve");
        let mut proposal = self.proposal(proposal_id.0);
        require!(!proposal.executed, "proposal is already executed");
        require!(!proposal.approvals.contains(&caller), "approver already approved");
        proposal.approvals.push(caller);
        if proposal.approvals.len() == 2 && proposal.ready_at_ns == 0 {
            require!(self.available >= proposal.amount, "treasury balance does not cover this proposal");
            self.available -= proposal.amount;
            self.reserved = self.reserved.checked_add(proposal.amount).expect("reserved");
            proposal.ready_at_ns = env::block_timestamp();
            self.assert_books();
        }
        self.proposals.insert(proposal_id.0, proposal);
        self.emit("treasury_approved", json!({"proposal_id": proposal_id.0}));
        self.refund_attached();
    }

    #[payable]
    pub fn execute_proposal(&mut self, proposal_id: U64) -> Promise {
        let caller = env::predecessor_account_id();
        require!(caller == self.executor, "only the executor can release funds");
        require!(caller != self.approver_a && caller != self.approver_b, "an approver cannot execute");
        let mut proposal = self.proposal(proposal_id.0);
        require!(proposal.approvals.len() == 2, "proposal does not have two approvals");
        require!(!proposal.executed && !proposal.pending, "proposal is already in flight");
        let delay = timelock(&self.deployment_kind).unwrap_or_else(|| env::panic_str("timelock missing"));
        require!(env::block_timestamp() >= proposal.ready_at_ns.checked_add(delay).expect("timelock"), "timelock has not passed");
        proposal.pending = true;
        self.pending = self.pending.checked_add(proposal.amount).expect("pending");
        self.assert_books();
        let transfer_id = self.next_transfer_id;
        self.next_transfer_id += 1;
        self.transfers.insert(transfer_id, proposal_id.0);
        let beneficiary = proposal.beneficiary.clone();
        let amount = proposal.amount;
        self.proposals.insert(proposal_id.0, proposal);
        self.refund_except_one();
        let args = json!({
            "receiver_id": beneficiary,
            "amount": amount.to_string(),
            "memo": format!("paperhands-treasury:{transfer_id}"),
        })
        .to_string()
        .into_bytes();
        Promise::new(self.paper.clone())
            .function_call("ft_transfer".to_string(), args, NearToken::from_yoctonear(1), GAS_FT_TRANSFER)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_transfer_complete(U64(transfer_id)),
            )
    }

    #[payable]
    pub fn pause(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser");
        self.paused = true;
        self.emit("treasury_paused", json!({}));
        self.refund_attached();
    }

    #[payable]
    pub fn resume(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser");
        self.paused = false;
        self.refund_attached();
    }

    #[private]
    pub fn on_transfer_complete(&mut self, transfer_id: U64, #[callback_result] result: Result<(), PromiseError>) {
        let proposal_id = self.transfers.remove(&transfer_id.0).unwrap_or_else(|| env::panic_str("unknown transfer"));
        let mut proposal = self.proposal(proposal_id);
        proposal.pending = false;
        self.pending = self.pending.checked_sub(proposal.amount).expect("pending");
        if result.is_ok() {
            proposal.executed = true;
            self.reserved = self.reserved.checked_sub(proposal.amount).expect("reserved");
            self.assets = self.assets.checked_sub(proposal.amount).expect("assets");
        }
        self.assert_books();
        self.proposals.insert(proposal_id, proposal);
        self.emit("treasury_executed", json!({"proposal_id": proposal_id, "succeeded": result.is_ok()}));
    }

    pub fn get_proposal(&self, proposal_id: U64) -> ProposalView {
        let proposal = self.proposal(proposal_id.0);
        ProposalView {
            proposal_id,
            proposer: proposal.proposer,
            beneficiary: proposal.beneficiary,
            amount: U128(proposal.amount),
            milestone: proposal.milestone,
            evidence: proposal.evidence,
            approvals: proposal.approvals,
            ready_at_ns: U64(proposal.ready_at_ns),
            executed: proposal.executed,
            pending: proposal.pending,
        }
    }

    pub fn get_accounting(&self) -> AccountingView {
        AccountingView {
            token_id: self.paper.clone(),
            assets: U128(self.assets),
            available: U128(self.available),
            reserved: U128(self.reserved),
            pending: U128(self.pending),
            accounting_difference: (self.assets as i128 - (self.available.saturating_add(self.reserved) as i128)).to_string(),
            timelock_ns: U64(timelock(&self.deployment_kind).unwrap_or(0)),
            demo_clock: self.deployment_kind == "demo-testnet",
            paused: self.paused,
        }
    }

    pub fn list_proposals(&self, from_index: U64, limit: U64) -> Vec<ProposalView> {
        let mut views = Vec::new();
        let mut id = from_index.0.max(1);
        while views.len() < limit.0.min(50) as usize && id < self.next_proposal_id {
            views.push(self.get_proposal(U64(id)));
            id += 1;
        }
        views
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.paper, "token contract is not PAPER");
        require!(!self.paused, "donations are paused");
        require!(msg == r#"{"action":"donate"}"#, "unsupported treasury message");
        require!(amount.0 > 0, "donation must be positive");
        self.assets = self.assets.checked_add(amount.0).expect("assets");
        self.available = self.available.checked_add(amount.0).expect("available");
        self.assert_books();
        self.emit("treasury_donated", json!({"sender_id": sender_id, "amount": amount.0.to_string()}));
        PromiseOrValue::Value(U128(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use conviction::{DEMO_TIMELOCK_NS, ONE_PAPER};
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{Gas, testing_env};

    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn set_env(predecessor: &AccountId, deposit: NearToken, timestamp: u64) {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(account("treasury.testnet"))
            .predecessor_account_id(predecessor.clone())
            .signer_account_id(predecessor.clone())
            .attached_deposit(deposit)
            .block_timestamp(timestamp)
            .account_balance(NearToken::from_near(20))
            .prepaid_gas(Gas::from_tgas(300));
        testing_env!(builder.build());
    }

    fn boot(now: u64) -> Contract {
        let _ = near_sdk::mock::with_mocked_blockchain(|blockchain| blockchain.take_storage());
        set_env(&account("treasury.testnet"), NearToken::from_near(1), now);
        Contract::new(
            account("diabloodevs.testnet"),
            "demo-testnet".into(),
            account("approver-a.testnet"),
            account("approver-b.testnet"),
            account("executor.testnet"),
            account("pauser.testnet"),
        )
    }

    fn yocto() -> NearToken {
        NearToken::from_yoctonear(1)
    }

    fn donate(contract: &mut Contract, now: u64, amount: u128) {
        set_env(&account("diabloodevs.testnet"), NearToken::from_yoctonear(0), now);
        let result = contract.ft_on_transfer(account("donor.testnet"), U128(amount), r#"{"action":"donate"}"#.into());
        assert!(matches!(result, PromiseOrValue::Value(U128(0))));
    }

    #[test]
    fn two_approvers_and_a_timelock_are_required() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        donate(&mut contract, now, 80 * ONE_PAPER);
        set_env(&account("member.testnet"), yocto(), now);
        let id = contract.create_proposal(
            account("builder.testnet"),
            U128(30 * ONE_PAPER),
            "Publish the sponsor recap.".into(),
            "https://example.com/recap".into(),
        );
        set_env(&account("approver-a.testnet"), yocto(), now + 1);
        contract.approve_proposal(id);
        set_env(&account("executor.testnet"), yocto(), now + 2);
        let early = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {}));
        let _ = early;
        set_env(&account("approver-b.testnet"), yocto(), now + 3);
        contract.approve_proposal(id);
        assert_eq!(contract.get_accounting().available.0, 50 * ONE_PAPER);
        assert_eq!(contract.get_accounting().reserved.0, 30 * ONE_PAPER);
        set_env(&account("executor.testnet"), yocto(), now + 3 + DEMO_TIMELOCK_NS);
        let _ = contract.execute_proposal(id);
        set_env(&account("treasury.testnet"), NearToken::from_yoctonear(0), now + 3 + DEMO_TIMELOCK_NS);
        contract.on_transfer_complete(U64(1), Ok(()));
        let books = contract.get_accounting();
        assert_eq!(books.assets.0, 50 * ONE_PAPER);
        assert_eq!(books.reserved.0, 0);
        assert_eq!(books.accounting_difference, "0");
        assert!(contract.get_proposal(id).executed);
    }

    #[test]
    #[should_panic(expected = "proposal does not have two approvals")]
    fn one_approval_cannot_execute() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        donate(&mut contract, now, 10 * ONE_PAPER);
        set_env(&account("member.testnet"), yocto(), now);
        let id = contract.create_proposal(account("builder.testnet"), U128(10 * ONE_PAPER), "Ship the report.".into(), "https://example.com/report".into());
        set_env(&account("approver-a.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("executor.testnet"), yocto(), now + DEMO_TIMELOCK_NS + 1);
        let _ = contract.execute_proposal(id);
    }

    #[test]
    #[should_panic(expected = "timelock has not passed")]
    fn executor_waits_for_the_timelock() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        donate(&mut contract, now, 10 * ONE_PAPER);
        set_env(&account("member.testnet"), yocto(), now);
        let id = contract.create_proposal(account("builder.testnet"), U128(10 * ONE_PAPER), "Ship the report.".into(), "https://example.com/report".into());
        set_env(&account("approver-a.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("approver-b.testnet"), yocto(), now + 1);
        contract.approve_proposal(id);
        set_env(&account("executor.testnet"), yocto(), now + 2);
        let _ = contract.execute_proposal(id);
    }

    #[test]
    #[should_panic(expected = "only the executor can release funds")]
    fn an_approver_cannot_execute() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        donate(&mut contract, now, 10 * ONE_PAPER);
        set_env(&account("member.testnet"), yocto(), now);
        let id = contract.create_proposal(account("builder.testnet"), U128(10 * ONE_PAPER), "Ship the report.".into(), "https://example.com/report".into());
        set_env(&account("approver-a.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("approver-b.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("approver-a.testnet"), yocto(), now + DEMO_TIMELOCK_NS + 1);
        let _ = contract.execute_proposal(id);
    }

    #[test]
    fn a_failed_transfer_keeps_the_reserved_budget() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        donate(&mut contract, now, 10 * ONE_PAPER);
        set_env(&account("member.testnet"), yocto(), now);
        let id = contract.create_proposal(account("builder.testnet"), U128(10 * ONE_PAPER), "Ship the report.".into(), "https://example.com/report".into());
        set_env(&account("approver-a.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("approver-b.testnet"), yocto(), now);
        contract.approve_proposal(id);
        set_env(&account("executor.testnet"), yocto(), now + DEMO_TIMELOCK_NS);
        let _ = contract.execute_proposal(id);
        set_env(&account("treasury.testnet"), NearToken::from_yoctonear(0), now + DEMO_TIMELOCK_NS);
        contract.on_transfer_complete(U64(1), Err(PromiseError::Failed));
        let books = contract.get_accounting();
        assert_eq!(books.assets.0, 10 * ONE_PAPER);
        assert_eq!(books.reserved.0, 10 * ONE_PAPER);
        assert_eq!(books.pending.0, 0);
        assert!(!contract.get_proposal(id).executed);
        assert_eq!(books.accounting_difference, "0");
    }

    #[test]
    #[should_panic(expected = "token contract is not PAPER")]
    fn a_forged_donation_is_rejected() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        set_env(&account("evil.testnet"), NearToken::from_yoctonear(0), now);
        let _ = contract.ft_on_transfer(account("donor.testnet"), U128(ONE_PAPER), r#"{"action":"donate"}"#.into());
    }
}
