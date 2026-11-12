//! Mission escrow for PAPERHANDS V3.
//!
//! Payouts come only from the mission budget. Reviewer decisions do not move
//! that budget until a challenge window closes, and the reviewer cannot refund it.

use conviction::{challenge_window, is_deployment_kind, preset_clocks};
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
#[derive(Clone, Copy, PartialEq, Eq)]
enum MissionState {
    Draft,
    Funded,
    Open,
    Closed,
}

#[near(serializers = [borsh])]
#[derive(Clone, Copy, PartialEq, Eq)]
enum SubmissionStatus {
    Pending,
    Accepted,
    Rejected,
    Challenged,
    FinalAccepted,
    FinalRejected,
    Expired,
    Settled,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Mission {
    sponsor_id: AccountId,
    reviewer_id: AccountId,
    escalation_id: AccountId,
    state: MissionState,
    objective: String,
    scope: String,
    criteria: String,
    payout_each: u128,
    max_acceptances: u32,
    provisional_accepts: u32,
    assigned: u32,
    submission_count: u32,
    unsettled: u32,
    deadline_ns: u64,
    challenge_window_ns: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Submission {
    mission_id: u64,
    account_id: AccountId,
    evidence: String,
    status: SubmissionStatus,
    reason: String,
    challenge_deadline_ns: u64,
    payout: u128,
    pending: bool,
    claimed: bool,
}

#[near(serializers = [borsh])]
#[derive(Clone, Default)]
struct Ledger {
    assets: u128,
    budget: u128,
    assigned: u128,
    refund: u128,
    pending: u128,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct PendingTransfer {
    mission_id: u64,
    account_id: AccountId,
    submission_id: u64,
    refund: bool,
    amount: u128,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    paper: AccountId,
    deployment_kind: String,
    pauser: AccountId,
    paused: bool,
    next_mission_id: u64,
    next_submission_id: u64,
    next_transfer_id: u64,
    missions: LookupMap<u64, Mission>,
    submissions: LookupMap<u64, Submission>,
    by_account: LookupMap<(u64, AccountId), u64>,
    ledgers: LookupMap<u64, Ledger>,
    transfers: LookupMap<u64, PendingTransfer>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct MissionView {
    pub mission_id: U64,
    pub sponsor_id: AccountId,
    pub reviewer_id: AccountId,
    pub escalation_id: AccountId,
    pub state: String,
    pub objective: String,
    pub scope: String,
    pub criteria: String,
    pub payout_each: U128,
    pub max_acceptances: u32,
    pub assigned: u32,
    pub deadline_ns: U64,
    pub challenge_window_ns: U64,
    pub demo_clock: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct SubmissionView {
    pub submission_id: U64,
    pub mission_id: U64,
    pub account_id: AccountId,
    pub evidence: String,
    pub status: String,
    pub reason: String,
    pub payout: U128,
    pub pending: bool,
    pub claimed: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct AccountingView {
    pub mission_id: U64,
    pub token_id: AccountId,
    pub assets: U128,
    pub budget: U128,
    pub assigned: U128,
    pub refund: U128,
    pub pending: U128,
    pub accounting_difference: String,
}

impl Ledger {
    fn liabilities(&self) -> u128 {
        self.budget.saturating_add(self.assigned).saturating_add(self.refund)
    }
}

fn bounded(value: String, max: usize, label: &str) -> String {
    let trimmed = value.trim().to_string();
    require!(!trimmed.is_empty(), format!("{label} is required"));
    require!(trimmed.len() <= max, format!("{label} is too long"));
    require!(!trimmed.contains('@'), format!("{label} cannot contain personal data"));
    trimmed
}

fn reason_ok(reason: &str, accepted: bool) -> bool {
    if accepted {
        reason == "accepted"
    } else {
        matches!(reason, "off_scope" | "insufficient_evidence" | "duplicate")
    }
}

impl Contract {
    fn emit(&self, event: &str, data: Value) {
        env::log_str(&format!(
            "EVENT_JSON:{}",
            json!({"standard":"paperhands-mission","version":"1.0.0","event":event,"data":[data]})
        ));
    }

    fn yocto(&self) {
        require!(env::attached_deposit() >= NearToken::from_yoctonear(1), "attach at least 1 yoctoNEAR");
    }

    fn refund_except(&self, keep: NearToken) {
        let attached = env::attached_deposit();
        require!(attached >= keep, "insufficient attached deposit");
        let refund = attached.saturating_sub(keep);
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(env::predecessor_account_id()).transfer(refund).detach();
        }
    }

    fn mission(&self, id: u64) -> Mission {
        self.missions.get(&id).cloned().unwrap_or_else(|| env::panic_str("mission not found"))
    }

    fn ledger(&self, id: u64) -> Ledger {
        self.ledgers.get(&id).cloned().unwrap_or_else(|| env::panic_str("mission ledger not found"))
    }

    fn save_ledger(&mut self, id: u64, ledger: Ledger) {
        require!(ledger.assets == ledger.liabilities(), "mission accounting broken");
        require!(ledger.pending <= ledger.assets, "pending exceeds mission assets");
        self.ledgers.insert(id, ledger);
    }

    fn state_name(state: MissionState) -> &'static str {
        match state {
            MissionState::Draft => "Draft",
            MissionState::Funded => "Funded",
            MissionState::Open => "Open",
            MissionState::Closed => "Closed",
        }
    }

    fn status_name(status: SubmissionStatus) -> &'static str {
        match status {
            SubmissionStatus::Pending => "Pending",
            SubmissionStatus::Accepted => "Accepted",
            SubmissionStatus::Rejected => "Rejected",
            SubmissionStatus::Challenged => "Challenged",
            SubmissionStatus::FinalAccepted => "FinalAccepted",
            SubmissionStatus::FinalRejected => "FinalRejected",
            SubmissionStatus::Expired => "Expired",
            SubmissionStatus::Settled => "Settled",
        }
    }

    fn pay(&self, receiver: AccountId, amount: u128, transfer_id: u64) -> Promise {
        let args = json!({
            "receiver_id": receiver,
            "amount": amount.to_string(),
            "memo": format!("paperhands-mission:{transfer_id}"),
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

    fn start_transfer(&mut self, pending: PendingTransfer) -> Promise {
        let mut ledger = self.ledger(pending.mission_id);
        ledger.pending = ledger.pending.checked_add(pending.amount).expect("pending");
        self.save_ledger(pending.mission_id, ledger);
        let transfer_id = self.next_transfer_id;
        self.next_transfer_id += 1;
        let receiver = pending.account_id.clone();
        let amount = pending.amount;
        self.transfers.insert(transfer_id, pending);
        self.pay(receiver, amount, transfer_id)
    }
}

#[near]
impl Contract {
    #[payable]
    #[init]
    pub fn new(paper_token: AccountId, deployment_kind: String, pauser: AccountId) -> Self {
        require!(env::attached_deposit() >= NearToken::from_millinear(300), "attach at least 0.3 NEAR to cover mission storage");
        require!(is_deployment_kind(&deployment_kind), "deployment_kind must be production or demo-testnet");
        require!(paper_token != env::current_account_id(), "paper token must be the Diamond Core contract");
        Self {
            paper: paper_token,
            deployment_kind,
            pauser,
            paused: false,
            next_mission_id: 1,
            next_submission_id: 1,
            next_transfer_id: 1,
            missions: LookupMap::new(b"m"),
            submissions: LookupMap::new(b"s"),
            by_account: LookupMap::new(b"b"),
            ledgers: LookupMap::new(b"l"),
            transfers: LookupMap::new(b"x"),
        }
    }

    #[payable]
    pub fn create_mission(
        &mut self,
        objective: String,
        scope: String,
        criteria: String,
        reviewer_id: AccountId,
        escalation_id: AccountId,
        payout_each: U128,
        max_acceptances: u32,
    ) -> U64 {
        self.yocto();
        require!(!self.paused, "new missions are paused");
        let sponsor_id = env::predecessor_account_id();
        require!(reviewer_id != sponsor_id, "the sponsor cannot be the only reviewer");
        require!(escalation_id != reviewer_id, "escalation must be a different account");
        require!(max_acceptances >= 1 && max_acceptances <= 50, "acceptances must be from 1 to 50");
        let payout_each = payout_each.0;
        require!(payout_each > 0, "payout must be positive");
        let id = self.next_mission_id;
        self.next_mission_id += 1;
        self.missions.insert(
            id,
            Mission {
                sponsor_id,
                reviewer_id,
                escalation_id,
                state: MissionState::Draft,
                objective: bounded(objective, 180, "objective"),
                scope: bounded(scope, 180, "scope"),
                criteria: bounded(criteria, 180, "criteria"),
                payout_each,
                max_acceptances,
                provisional_accepts: 0,
                assigned: 0,
                submission_count: 0,
                unsettled: 0,
                deadline_ns: 0,
                challenge_window_ns: 0,
            },
        );
        self.save_ledger(id, Ledger::default());
        self.emit("mission_created", json!({"mission_id": id, "payout_each": payout_each.to_string(), "max_acceptances": max_acceptances}));
        self.refund_except(NearToken::from_yoctonear(0));
        U64(id)
    }

    #[payable]
    pub fn open_mission(&mut self, mission_id: U64) {
        self.yocto();
        let mut mission = self.mission(mission_id.0);
        require!(env::predecessor_account_id() == mission.sponsor_id, "only the sponsor can open the mission");
        require!(mission.state == MissionState::Funded, "mission is not funded");
        let (duration, _) = preset_clocks(&self.deployment_kind).unwrap_or_else(|| env::panic_str("preset missing"));
        let now = env::block_timestamp();
        mission.deadline_ns = now.checked_add(duration).expect("deadline");
        mission.challenge_window_ns = challenge_window(&self.deployment_kind).unwrap_or_else(|| env::panic_str("window missing"));
        mission.state = MissionState::Open;
        self.missions.insert(mission_id.0, mission);
        self.emit("mission_opened", json!({"mission_id": mission_id.0}));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn submit_evidence(&mut self, mission_id: U64, evidence: String) -> U64 {
        self.yocto();
        require!(!self.paused, "submissions are paused");
        let mut mission = self.mission(mission_id.0);
        require!(mission.state == MissionState::Open, "mission is not open");
        require!(env::block_timestamp() < mission.deadline_ns, "mission deadline has passed");
        let account_id = env::predecessor_account_id();
        require!(self.by_account.get(&(mission_id.0, account_id.clone())).is_none(), "account already submitted");
        let evidence = bounded(evidence, 180, "evidence");
        let id = self.next_submission_id;
        self.next_submission_id += 1;
        mission.submission_count += 1;
        mission.unsettled += 1;
        self.missions.insert(mission_id.0, mission);
        self.submissions.insert(
            id,
            Submission {
                mission_id: mission_id.0,
                account_id: account_id.clone(),
                evidence,
                status: SubmissionStatus::Pending,
                reason: String::new(),
                challenge_deadline_ns: 0,
                payout: 0,
                pending: false,
                claimed: false,
            },
        );
        self.by_account.insert((mission_id.0, account_id), id);
        self.emit("mission_submitted", json!({"mission_id": mission_id.0, "submission_id": id}));
        self.refund_except(NearToken::from_yoctonear(0));
        U64(id)
    }

    #[payable]
    pub fn review_submission(&mut self, submission_id: U64, accepted: bool, reason: String) {
        self.yocto();
        require!(!self.paused, "reviews are paused");
        let reason = bounded(reason, 40, "reason");
        require!(reason_ok(&reason, accepted), "reason code is not allowed");
        let mut submission = self.submissions.get(&submission_id.0).cloned().unwrap_or_else(|| env::panic_str("submission not found"));
        let mut mission = self.mission(submission.mission_id);
        require!(env::predecessor_account_id() == mission.reviewer_id, "only the reviewer can review");
        require!(submission.status == SubmissionStatus::Pending, "submission is not pending");
        require!(env::block_timestamp() < mission.deadline_ns, "review window has closed");
        if accepted {
            require!(mission.provisional_accepts < mission.max_acceptances, "acceptance cap is full");
            mission.provisional_accepts += 1;
            submission.status = SubmissionStatus::Accepted;
        } else {
            submission.status = SubmissionStatus::Rejected;
        }
        submission.reason = reason;
        submission.challenge_deadline_ns = env::block_timestamp().checked_add(mission.challenge_window_ns).expect("challenge deadline");
        self.missions.insert(submission.mission_id, mission);
        self.submissions.insert(submission_id.0, submission);
        self.emit("mission_reviewed", json!({"submission_id": submission_id.0, "accepted": accepted}));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn challenge_submission(&mut self, submission_id: U64) {
        self.yocto();
        let mut submission = self.submissions.get(&submission_id.0).cloned().unwrap_or_else(|| env::panic_str("submission not found"));
        require!(env::predecessor_account_id() == submission.account_id, "only the submitter can challenge");
        require!(matches!(submission.status, SubmissionStatus::Accepted | SubmissionStatus::Rejected), "submission cannot be challenged");
        require!(env::block_timestamp() < submission.challenge_deadline_ns, "challenge window has closed");
        submission.status = SubmissionStatus::Challenged;
        self.submissions.insert(submission_id.0, submission);
        self.emit("mission_challenged", json!({"submission_id": submission_id.0}));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn escalate_submission(&mut self, submission_id: U64, accepted: bool, reason: String) {
        self.yocto();
        let reason = bounded(reason, 40, "reason");
        require!(reason_ok(&reason, accepted), "reason code is not allowed");
        let mut submission = self.submissions.get(&submission_id.0).cloned().unwrap_or_else(|| env::panic_str("submission not found"));
        let mut mission = self.mission(submission.mission_id);
        require!(env::predecessor_account_id() == mission.escalation_id, "only the escalation account can decide");
        require!(submission.status == SubmissionStatus::Challenged, "submission is not challenged");
        if accepted {
            require!(mission.provisional_accepts < mission.max_acceptances || submission.reason == "accepted", "acceptance cap is full");
            if submission.reason != "accepted" {
                mission.provisional_accepts += 1;
            }
            submission.status = SubmissionStatus::FinalAccepted;
        } else {
            if submission.reason == "accepted" {
                mission.provisional_accepts = mission.provisional_accepts.checked_sub(1).expect("provisional");
            }
            submission.status = SubmissionStatus::FinalRejected;
        }
        submission.reason = reason;
        self.missions.insert(submission.mission_id, mission);
        self.submissions.insert(submission_id.0, submission);
        self.emit("mission_escalated", json!({"submission_id": submission_id.0, "accepted": accepted}));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn settle_submission(&mut self, submission_id: U64) {
        self.yocto();
        let mut submission = self.submissions.get(&submission_id.0).cloned().unwrap_or_else(|| env::panic_str("submission not found"));
        let mut mission = self.mission(submission.mission_id);
        let now = env::block_timestamp();
        let pay = match submission.status {
            SubmissionStatus::Pending => {
                require!(now >= mission.deadline_ns, "submission is still open");
                submission.status = SubmissionStatus::Expired;
                false
            }
            SubmissionStatus::Accepted | SubmissionStatus::Rejected => {
                require!(now >= submission.challenge_deadline_ns, "challenge window is still open");
                let accepted = submission.status == SubmissionStatus::Accepted;
                submission.status = SubmissionStatus::Settled;
                accepted
            }
            SubmissionStatus::FinalAccepted => {
                submission.status = SubmissionStatus::Settled;
                true
            }
            SubmissionStatus::FinalRejected => {
                submission.status = SubmissionStatus::Settled;
                false
            }
            _ => env::panic_str("submission is not ready to settle"),
        };
        if pay {
            let mut ledger = self.ledger(submission.mission_id);
            require!(ledger.budget >= mission.payout_each, "mission budget is short");
            ledger.budget -= mission.payout_each;
            ledger.assigned = ledger.assigned.checked_add(mission.payout_each).expect("assigned");
            self.save_ledger(submission.mission_id, ledger);
            submission.payout = mission.payout_each;
            mission.assigned += 1;
        }
        mission.unsettled = mission.unsettled.checked_sub(1).expect("unsettled");
        if mission.unsettled == 0 && now >= mission.deadline_ns {
            mission.state = MissionState::Closed;
        }
        self.missions.insert(submission.mission_id, mission);
        self.submissions.insert(submission_id.0, submission);
        self.emit("mission_settled", json!({"submission_id": submission_id.0, "paid": pay}));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn claim_payout(&mut self, submission_id: U64) -> Promise {
        let mut submission = self.submissions.get(&submission_id.0).cloned().unwrap_or_else(|| env::panic_str("submission not found"));
        require!(env::predecessor_account_id() == submission.account_id, "only the submitter can claim");
        require!(submission.payout > 0 && !submission.pending && !submission.claimed, "no payout to claim");
        submission.pending = true;
        let amount = submission.payout;
        let account_id = submission.account_id.clone();
        let mission_id = submission.mission_id;
        self.submissions.insert(submission_id.0, submission);
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(PendingTransfer {
            mission_id,
            account_id,
            submission_id: submission_id.0,
            refund: false,
            amount,
        })
    }

    #[payable]
    pub fn refund_unspent(&mut self, mission_id: U64) -> Promise {
        let mission = self.mission(mission_id.0);
        let caller = env::predecessor_account_id();
        require!(caller == mission.sponsor_id, "only the sponsor can refund unspent budget");
        require!(caller != mission.reviewer_id, "the reviewer cannot withdraw the mission budget");
        require!(env::block_timestamp() >= mission.deadline_ns, "mission deadline has not passed");
        require!(mission.unsettled == 0, "submissions are still open");
        let mut ledger = self.ledger(mission_id.0);
        let amount = ledger.budget;
        require!(amount > 0, "nothing to refund");
        ledger.budget = ledger.budget.checked_sub(amount).expect("budget");
        ledger.refund = ledger.refund.checked_add(amount).expect("refund");
        self.save_ledger(mission_id.0, ledger);
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(PendingTransfer {
            mission_id: mission_id.0,
            account_id: caller,
            submission_id: 0,
            refund: true,
            amount,
        })
    }

    #[payable]
    pub fn pause(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser");
        self.paused = true;
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn resume(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser");
        self.paused = false;
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[private]
    pub fn on_transfer_complete(&mut self, transfer_id: U64, #[callback_result] result: Result<(), PromiseError>) {
        let pending = self.transfers.remove(&transfer_id.0).unwrap_or_else(|| env::panic_str("unknown transfer"));
        let mut ledger = self.ledger(pending.mission_id);
        ledger.pending = ledger.pending.checked_sub(pending.amount).expect("pending");
        if result.is_ok() {
            ledger.assets = ledger.assets.checked_sub(pending.amount).expect("assets");
            if pending.refund {
                ledger.refund = ledger.refund.checked_sub(pending.amount).expect("refund");
            } else {
                ledger.assigned = ledger.assigned.checked_sub(pending.amount).expect("assigned");
            }
        } else if pending.refund {
            ledger.refund = ledger.refund.checked_sub(pending.amount).expect("refund");
            ledger.budget = ledger.budget.checked_add(pending.amount).expect("budget");
        }
        self.save_ledger(pending.mission_id, ledger);
        if !pending.refund {
            let mut submission = self.submissions.get(&pending.submission_id).cloned().unwrap_or_else(|| env::panic_str("submission missing"));
            submission.pending = false;
            if result.is_ok() {
                submission.claimed = true;
            }
            self.submissions.insert(pending.submission_id, submission);
        }
        let event = if pending.refund { "mission_refunded" } else { "mission_paid" };
        self.emit(event, json!({"mission_id": pending.mission_id, "amount": pending.amount.to_string(), "succeeded": result.is_ok()}));
    }

    pub fn get_mission(&self, mission_id: U64) -> MissionView {
        let mission = self.mission(mission_id.0);
        MissionView {
            mission_id,
            sponsor_id: mission.sponsor_id,
            reviewer_id: mission.reviewer_id,
            escalation_id: mission.escalation_id,
            state: Self::state_name(mission.state).to_string(),
            objective: mission.objective,
            scope: mission.scope,
            criteria: mission.criteria,
            payout_each: U128(mission.payout_each),
            max_acceptances: mission.max_acceptances,
            assigned: mission.assigned,
            deadline_ns: U64(mission.deadline_ns),
            challenge_window_ns: U64(mission.challenge_window_ns),
            demo_clock: self.deployment_kind == "demo-testnet",
        }
    }

    pub fn get_submission(&self, submission_id: U64) -> Option<SubmissionView> {
        self.submissions.get(&submission_id.0).cloned().map(|submission| SubmissionView {
            submission_id,
            mission_id: U64(submission.mission_id),
            account_id: submission.account_id,
            evidence: submission.evidence,
            status: Self::status_name(submission.status).to_string(),
            reason: submission.reason,
            payout: U128(submission.payout),
            pending: submission.pending,
            claimed: submission.claimed,
        })
    }

    pub fn get_mission_accounting(&self, mission_id: U64) -> AccountingView {
        let ledger = self.ledger(mission_id.0);
        AccountingView {
            mission_id,
            token_id: self.paper.clone(),
            assets: U128(ledger.assets),
            budget: U128(ledger.budget),
            assigned: U128(ledger.assigned),
            refund: U128(ledger.refund),
            pending: U128(ledger.pending),
            accounting_difference: (ledger.assets as i128 - ledger.liabilities() as i128).to_string(),
        }
    }

    pub fn list_missions(&self, from_index: U64, limit: U64) -> Vec<MissionView> {
        let mut views = Vec::new();
        let mut id = from_index.0.max(1);
        while views.len() < limit.0.min(50) as usize && id < self.next_mission_id {
            views.push(self.get_mission(U64(id)));
            id += 1;
        }
        views
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.paper, "token contract is not PAPER");
        require!(!self.paused, "mission funding is paused");
        let parsed: Value = near_sdk::serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("malformed mission message"));
        require!(parsed["action"].as_str() == Some("fund_mission"), "unsupported mission message");
        let mission_id = parsed["mission_id"].as_u64().unwrap_or_else(|| env::panic_str("malformed mission message"));
        let mut mission = self.mission(mission_id);
        require!(mission.state == MissionState::Draft, "mission is not awaiting funds");
        require!(sender_id == mission.sponsor_id, "only the sponsor can fund the mission");
        let required = mission.payout_each.checked_mul(u128::from(mission.max_acceptances)).expect("budget");
        if amount.0 != required {
            return PromiseOrValue::Value(amount);
        }
        mission.state = MissionState::Funded;
        self.missions.insert(mission_id, mission);
        let mut ledger = self.ledger(mission_id);
        ledger.assets = ledger.assets.checked_add(required).expect("assets");
        ledger.budget = ledger.budget.checked_add(required).expect("budget");
        self.save_ledger(mission_id, ledger);
        self.emit("mission_funded", json!({"mission_id": mission_id, "amount": required.to_string()}));
        PromiseOrValue::Value(U128(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use conviction::{DEMO_CHALLENGE_NS, DEMO_DURATION_NS, ONE_PAPER};
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{Gas, testing_env};

    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn set_env(predecessor: &AccountId, deposit: NearToken, timestamp: u64) {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id(account("missions.testnet"))
            .predecessor_account_id(predecessor.clone())
            .signer_account_id(predecessor.clone())
            .attached_deposit(deposit)
            .block_timestamp(timestamp)
            .account_balance(NearToken::from_near(30))
            .prepaid_gas(Gas::from_tgas(300));
        testing_env!(builder.build());
    }

    fn boot(now: u64) -> Contract {
        let _ = near_sdk::mock::with_mocked_blockchain(|blockchain| blockchain.take_storage());
        set_env(&account("missions.testnet"), NearToken::from_near(2), now);
        Contract::new(account("diabloodevs.testnet"), "demo-testnet".into(), account("pauser.testnet"))
    }

    fn yocto() -> NearToken {
        NearToken::from_yoctonear(1)
    }

    #[test]
    fn accepted_work_is_paid_from_escrow_and_reviewer_cannot_refund() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        set_env(&account("sponsor.testnet"), yocto(), now);
        let id = contract.create_mission(
            "Write the campaign recap".into(),
            "One public recap of the sponsored epoch.".into(),
            "Link to the merged pull request.".into(),
            account("reviewer.testnet"),
            account("escalation.testnet"),
            U128(100 * ONE_PAPER),
            2,
        );
        set_env(&account("diabloodevs.testnet"), NearToken::from_yoctonear(0), now);
        let unused = contract.ft_on_transfer(
            account("sponsor.testnet"),
            U128(200 * ONE_PAPER),
            format!(r#"{{"action":"fund_mission","mission_id":{}}}"#, id.0),
        );
        assert!(matches!(unused, PromiseOrValue::Value(U128(0))));
        set_env(&account("sponsor.testnet"), yocto(), now);
        contract.open_mission(id);
        set_env(&account("worker.testnet"), yocto(), now + 1);
        let submission = contract.submit_evidence(id, "https://example.com/recap".into());
        set_env(&account("reviewer.testnet"), yocto(), now + 2);
        contract.review_submission(submission, true, "accepted".into());
        set_env(&account("worker.testnet"), yocto(), now + DEMO_DURATION_NS);
        let _ = contract.settle_submission(submission);
        let view = contract.get_submission(submission).unwrap();
        assert_eq!(view.payout.0, 100 * ONE_PAPER);
        assert_eq!(contract.get_mission_accounting(id).budget.0, 100 * ONE_PAPER);
        assert_eq!(contract.get_mission_accounting(id).assigned.0, 100 * ONE_PAPER);
        assert_eq!(contract.get_mission_accounting(id).accounting_difference, "0");
        set_env(&account("worker.testnet"), yocto(), now + DEMO_DURATION_NS + 1);
        let _ = contract.claim_payout(submission);
        set_env(&account("missions.testnet"), NearToken::from_yoctonear(0), now + DEMO_DURATION_NS + 1);
        contract.on_transfer_complete(U64(1), Ok(()));
        let books = contract.get_mission_accounting(id);
        assert_eq!(books.assigned.0, 0);
        assert_eq!(books.assets.0, 100 * ONE_PAPER);
        assert_eq!(books.accounting_difference, "0");
        let _ = DEMO_CHALLENGE_NS;
    }

    #[test]
    #[should_panic(expected = "only the sponsor can refund unspent budget")]
    fn reviewer_cannot_refund_the_pool() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        set_env(&account("sponsor.testnet"), yocto(), now);
        let id = contract.create_mission(
            "Write the campaign recap".into(),
            "One public recap.".into(),
            "A link is enough.".into(),
            account("reviewer.testnet"),
            account("escalation.testnet"),
            U128(100 * ONE_PAPER),
            1,
        );
        set_env(&account("diabloodevs.testnet"), NearToken::from_yoctonear(0), now);
        let _ = contract.ft_on_transfer(
            account("sponsor.testnet"),
            U128(100 * ONE_PAPER),
            format!(r#"{{"action":"fund_mission","mission_id":{}}}"#, id.0),
        );
        set_env(&account("sponsor.testnet"), yocto(), now);
        contract.open_mission(id);
        set_env(&account("reviewer.testnet"), yocto(), now + DEMO_DURATION_NS);
        let _ = contract.refund_unspent(id);
    }

    #[test]
    fn challenge_can_reverse_an_acceptance_and_the_budget_stays() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        set_env(&account("sponsor.testnet"), yocto(), now);
        let id = contract.create_mission(
            "Document the rules".into(),
            "Explain the separate sponsor lock.".into(),
            "The page must not merge streaks.".into(),
            account("reviewer.testnet"),
            account("escalation.testnet"),
            U128(50 * ONE_PAPER),
            1,
        );
        set_env(&account("diabloodevs.testnet"), NearToken::from_yoctonear(0), now);
        let _ = contract.ft_on_transfer(
            account("sponsor.testnet"),
            U128(50 * ONE_PAPER),
            format!(r#"{{"action":"fund_mission","mission_id":{}}}"#, id.0),
        );
        set_env(&account("sponsor.testnet"), yocto(), now);
        contract.open_mission(id);
        set_env(&account("worker.testnet"), yocto(), now + 1);
        let submission = contract.submit_evidence(id, "https://example.com/rules".into());
        set_env(&account("reviewer.testnet"), yocto(), now + 2);
        contract.review_submission(submission, true, "accepted".into());
        set_env(&account("worker.testnet"), yocto(), now + 3);
        contract.challenge_submission(submission);
        set_env(&account("escalation.testnet"), yocto(), now + 4);
        contract.escalate_submission(submission, false, "off_scope".into());
        set_env(&account("sponsor.testnet"), yocto(), now + 5);
        let _ = contract.settle_submission(submission);
        assert_eq!(contract.get_submission(submission).unwrap().payout.0, 0);
        assert_eq!(contract.get_mission_accounting(id).budget.0, 50 * ONE_PAPER);
        assert_eq!(contract.get_mission_accounting(id).accounting_difference, "0");
        set_env(&account("sponsor.testnet"), yocto(), now + DEMO_DURATION_NS);
        let _ = contract.refund_unspent(id);
        set_env(&account("missions.testnet"), NearToken::from_yoctonear(0), now + DEMO_DURATION_NS);
        contract.on_transfer_complete(U64(1), Ok(()));
        let books = contract.get_mission_accounting(id);
        assert_eq!(books.assets.0, 0);
        assert_eq!(books.accounting_difference, "0");
    }

    #[test]
    #[should_panic(expected = "evidence cannot contain personal data")]
    fn evidence_rejects_an_email_address() {
        let now = 1_000_000_000_000_000;
        let mut contract = boot(now);
        set_env(&account("sponsor.testnet"), yocto(), now);
        let id = contract.create_mission(
            "Document the rules".into(),
            "Public text only.".into(),
            "No personal data.".into(),
            account("reviewer.testnet"),
            account("escalation.testnet"),
            U128(ONE_PAPER),
            1,
        );
        set_env(&account("diabloodevs.testnet"), NearToken::from_yoctonear(0), now);
        let _ = contract.ft_on_transfer(account("sponsor.testnet"), U128(ONE_PAPER), format!(r#"{{"action":"fund_mission","mission_id":{}}}"#, id.0));
        set_env(&account("sponsor.testnet"), yocto(), now);
        contract.open_mission(id);
        set_env(&account("worker.testnet"), yocto(), now + 1);
        let _ = contract.submit_evidence(id, "mail me at ada@example.com".into());
    }
}
