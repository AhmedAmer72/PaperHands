//! Sponsored epochs for PAPERHANDS V3.
//!
//! This contract escrows PAPER for one campaign at a time per ledger. It does
//! not mint, burn, or read Diamond Core reserves. A join here is a second
//! 1,000 PAPER lock, not a Core commitment.

#[cfg(test)]
mod tests;

use conviction::{
    CLAIM_WINDOW_NS, COMMITMENT, early_exit, equal_split, is_deployment_kind, preset_clocks,
    retention_bps, retention_met, thresholds_ok,
};
use near_contract_standards::fungible_token::receiver::FungibleTokenReceiver;
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::{Value, json};
use near_sdk::store::LookupMap;
use near_sdk::{
    AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue, env, near,
    require,
};

const STANDARD: &str = "paperhands-sponsor";
const VERSION: &str = "1.0.0";
const GAS_FT_TRANSFER: Gas = Gas::from_tgas(35);
const GAS_CALLBACK: Gas = Gas::from_tgas(40);
fn storage_float() -> NearToken {
    NearToken::from_millinear(300)
}

#[near(serializers = [borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum CampaignState {
    Draft,
    Funded,
    EntryOpen,
    Active,
    FinalizedSuccess,
    FinalizedFailed,
    Swept,
    CancelledBeforeJoin,
}

#[near(serializers = [borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum PositionStatus {
    Active,
    Cancelled,
    Exited,
}

#[near(serializers = [borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum TransferKind {
    Principal,
    Bonus,
    SponsorReward,
    Refund,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Campaign {
    sponsor_id: AccountId,
    state: CampaignState,
    name: String,
    description: String,
    link: String,
    preset: String,
    reward_amount: u128,
    entry_start_ns: u64,
    entry_end_ns: u64,
    campaign_end_ns: u64,
    claim_deadline_ns: u64,
    min_original: u32,
    target_retention_bps: u32,
    participant_cap: u32,
    join_count: u32,
    active_participants: u32,
    original_participants: u32,
    early_exits: u32,
    sponsor_share: u128,
    bonus_per_survivor: u128,
    retention_bps: u32,
    success: bool,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Position {
    status: PositionStatus,
    joined_at_ns: u64,
    exited_at_ns: u64,
    principal_pending: bool,
    bonus_pending: bool,
    reward_pending: bool,
    principal_claimed: bool,
    bonus_claimed: bool,
    reward_claimed: bool,
}

#[near(serializers = [borsh])]
#[derive(Clone, Default)]
struct Ledger {
    assets: u128,
    principal: u128,
    sponsor_reward: u128,
    survivor_bonus: u128,
    protocol_reserve: u128,
    refund: u128,
    dust_recorded: u128,
    pending_transfer: u128,
    pending_principal: u128,
    pending_bonus: u128,
    pending_reward: u128,
    pending_refund: u128,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct PendingTransfer {
    campaign_id: u64,
    account_id: AccountId,
    kind: TransferKind,
    amount: u128,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
struct AllowProposal {
    token_id: AccountId,
    enabled: bool,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    paper: AccountId,
    deployment_kind: String,
    pauser: AccountId,
    token_proposer: AccountId,
    token_approver: AccountId,
    joins_paused: bool,
    next_campaign_id: u64,
    next_transfer_id: u64,
    campaigns: LookupMap<u64, Campaign>,
    positions: LookupMap<(u64, AccountId), Position>,
    ledgers: LookupMap<u64, Ledger>,
    transfers: LookupMap<u64, PendingTransfer>,
    allowed: LookupMap<AccountId, bool>,
    pending_allowlist: Option<AllowProposal>,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct CampaignView {
    pub campaign_id: U64,
    pub sponsor_id: AccountId,
    pub state: String,
    pub name: String,
    pub description: String,
    pub link: String,
    pub preset: String,
    pub demo_clock: bool,
    pub separate_lock: bool,
    pub commitment_token: AccountId,
    pub commitment_amount: U128,
    pub reward_token: AccountId,
    pub reward_amount: U128,
    pub entry_start_ns: U64,
    pub entry_end_ns: U64,
    pub campaign_end_ns: U64,
    pub claim_deadline_ns: U64,
    pub min_original: u32,
    pub target_retention_bps: u32,
    pub participant_cap: u32,
    pub join_count: u32,
    pub active_participants: u32,
    pub original_participants: u32,
    pub early_exits: u32,
    pub success: Option<bool>,
    pub retention_bps: u32,
    pub sponsor_share: U128,
    pub bonus_per_survivor: U128,
    pub rewards_swept: bool,
    pub early_exit_is_burn: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct ParticipantView {
    pub account_id: AccountId,
    pub status: String,
    pub joined_at_ns: U64,
    pub principal_available: U128,
    pub bonus_available: U128,
    pub sponsor_reward_available: U128,
    pub principal_pending: bool,
    pub bonus_pending: bool,
    pub sponsor_reward_pending: bool,
    pub principal_claimed: bool,
    pub bonus_claimed: bool,
    pub sponsor_reward_claimed: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct AccountingView {
    pub campaign_id: U64,
    pub token_id: AccountId,
    pub assets: U128,
    pub principal_liability: U128,
    pub sponsor_reward_liability: U128,
    pub survivor_bonus_liability: U128,
    pub protocol_reserve: U128,
    pub refund_liability: U128,
    pub dust_recorded: U128,
    pub pending_transfer: U128,
    pub accounting_difference: String,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct TokenView {
    pub token_id: AccountId,
    pub enabled: bool,
    pub transfers_accepted: bool,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct ProtocolConfigView {
    pub paper_token: AccountId,
    pub deployment_kind: String,
    pub demo_clock: bool,
    pub commitment_amount: U128,
    pub min_originals: u32,
    pub min_retention_bps: u32,
    pub max_participant_cap: u32,
    pub claim_window_ns: U64,
    pub protocol_fee_bps: u32,
    pub joins_paused: bool,
    pub pauser: AccountId,
    pub token_proposer: AccountId,
    pub token_approver: AccountId,
    pub early_exit_burned: bool,
    pub next_campaign_id: U64,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct TransferView {
    pub transfer_id: U64,
    pub campaign_id: U64,
    pub account_id: AccountId,
    pub kind: String,
    pub amount: U128,
}

impl Ledger {
    fn liabilities(&self) -> u128 {
        self.principal
            .saturating_add(self.sponsor_reward)
            .saturating_add(self.survivor_bonus)
            .saturating_add(self.protocol_reserve)
            .saturating_add(self.refund)
    }
}

impl Contract {
    fn emit(&self, event: &str, data: Value) {
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

    fn yocto(&self) {
        require!(
            env::attached_deposit() >= NearToken::from_yoctonear(1),
            "attach at least 1 yoctoNEAR"
        );
    }

    fn refund_except(&self, keep: NearToken) {
        let attached = env::attached_deposit();
        require!(attached >= keep, "insufficient attached deposit");
        let refund = attached.saturating_sub(keep);
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(env::predecessor_account_id())
                .transfer(refund)
                .detach();
        }
    }

    fn campaign(&self, id: u64) -> Campaign {
        self.campaigns
            .get(&id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("campaign not found"))
    }

    fn ledger(&self, id: u64) -> Ledger {
        self.ledgers
            .get(&id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("campaign ledger not found"))
    }

    fn position(&self, id: u64, account: &AccountId) -> Position {
        self.positions
            .get(&(id, account.clone()))
            .cloned()
            .unwrap_or_else(|| env::panic_str("no position in this campaign"))
    }

    fn save_campaign(&mut self, id: u64, campaign: Campaign) {
        self.campaigns.insert(id, campaign);
    }

    fn save_ledger(&mut self, id: u64, ledger: Ledger) {
        self.assert_ledger(&ledger);
        self.ledgers.insert(id, ledger);
    }

    fn assert_ledger(&self, ledger: &Ledger) {
        require!(
            ledger.assets == ledger.liabilities(),
            "campaign accounting broken"
        );
        require!(
            ledger.pending_transfer <= ledger.assets,
            "pending transfer exceeds campaign assets"
        );
        let pending = ledger
            .pending_principal
            .saturating_add(ledger.pending_bonus)
            .saturating_add(ledger.pending_reward)
            .saturating_add(ledger.pending_refund);
        require!(pending == ledger.pending_transfer, "pending buckets drifted");
    }

    fn state_name(state: CampaignState) -> &'static str {
        match state {
            CampaignState::Draft => "Draft",
            CampaignState::Funded => "Funded",
            CampaignState::EntryOpen => "EntryOpen",
            CampaignState::Active => "Active",
            CampaignState::FinalizedSuccess => "FinalizedSuccess",
            CampaignState::FinalizedFailed => "FinalizedFailed",
            CampaignState::Swept => "Swept",
            CampaignState::CancelledBeforeJoin => "CancelledBeforeJoin",
        }
    }

    fn finalized(state: CampaignState) -> bool {
        matches!(
            state,
            CampaignState::FinalizedSuccess
                | CampaignState::FinalizedFailed
                | CampaignState::Swept
        )
    }

    fn view_campaign(&self, id: u64, campaign: &Campaign) -> CampaignView {
        CampaignView {
            campaign_id: U64(id),
            sponsor_id: campaign.sponsor_id.clone(),
            state: Self::state_name(campaign.state).to_string(),
            name: campaign.name.clone(),
            description: campaign.description.clone(),
            link: campaign.link.clone(),
            preset: campaign.preset.clone(),
            demo_clock: campaign.preset == "demo-testnet",
            separate_lock: true,
            commitment_token: self.paper.clone(),
            commitment_amount: U128(COMMITMENT),
            reward_token: self.paper.clone(),
            reward_amount: U128(campaign.reward_amount),
            entry_start_ns: U64(campaign.entry_start_ns),
            entry_end_ns: U64(campaign.entry_end_ns),
            campaign_end_ns: U64(campaign.campaign_end_ns),
            claim_deadline_ns: U64(campaign.claim_deadline_ns),
            min_original: campaign.min_original,
            target_retention_bps: campaign.target_retention_bps,
            participant_cap: campaign.participant_cap,
            join_count: campaign.join_count,
            active_participants: campaign.active_participants,
            original_participants: campaign.original_participants,
            early_exits: campaign.early_exits,
            success: Self::finalized(campaign.state).then_some(campaign.success),
            retention_bps: campaign.retention_bps,
            sponsor_share: U128(campaign.sponsor_share),
            bonus_per_survivor: U128(campaign.bonus_per_survivor),
            rewards_swept: campaign.state == CampaignState::Swept,
            early_exit_is_burn: false,
        }
    }

    fn status_name(campaign: &Campaign, position: &Position) -> &'static str {
        match position.status {
            PositionStatus::Cancelled => "Cancelled",
            PositionStatus::Exited => "Exited",
            PositionStatus::Active if Self::finalized(campaign.state) => "Survivor",
            PositionStatus::Active => "Active",
        }
    }

    fn principal_available(&self, campaign: &Campaign, position: &Position) -> u128 {
        if position.principal_pending || position.principal_claimed {
            return 0;
        }
        match position.status {
            PositionStatus::Cancelled => COMMITMENT,
            PositionStatus::Exited => early_exit(COMMITMENT).returned,
            PositionStatus::Active if Self::finalized(campaign.state) => COMMITMENT,
            PositionStatus::Active => 0,
        }
    }

    fn bonus_available(&self, campaign: &Campaign, position: &Position) -> u128 {
        if position.bonus_pending || position.bonus_claimed || position.status != PositionStatus::Active {
            return 0;
        }
        if !Self::finalized(campaign.state) {
            return 0;
        }
        campaign.bonus_per_survivor
    }

    fn reward_available(&self, campaign: &Campaign, position: &Position) -> u128 {
        if position.reward_pending
            || position.reward_claimed
            || position.status != PositionStatus::Active
            || campaign.state == CampaignState::Swept
            || !campaign.success
            || !Self::finalized(campaign.state)
        {
            return 0;
        }
        if env::block_timestamp() >= campaign.claim_deadline_ns {
            return 0;
        }
        campaign.sponsor_share
    }

    fn participant_view(&self, account: AccountId, campaign: &Campaign, position: &Position) -> ParticipantView {
        ParticipantView {
            account_id: account,
            status: Self::status_name(campaign, position).to_string(),
            joined_at_ns: U64(position.joined_at_ns),
            principal_available: U128(self.principal_available(campaign, position)),
            bonus_available: U128(self.bonus_available(campaign, position)),
            sponsor_reward_available: U128(self.reward_available(campaign, position)),
            principal_pending: position.principal_pending,
            bonus_pending: position.bonus_pending,
            sponsor_reward_pending: position.reward_pending,
            principal_claimed: position.principal_claimed,
            bonus_claimed: position.bonus_claimed,
            sponsor_reward_claimed: position.reward_claimed,
        }
    }

    fn bounded(value: String, max: usize, label: &str) -> String {
        let trimmed = value.trim().to_string();
        require!(!trimmed.is_empty(), format!("{label} is required"));
        require!(trimmed.len() <= max, format!("{label} is too long"));
        require!(!trimmed.contains('@'), format!("{label} cannot contain an email address"));
        trimmed
    }

    fn accounting_view(&self, id: u64, ledger: &Ledger) -> AccountingView {
        let difference = ledger.assets as i128 - ledger.liabilities() as i128;
        AccountingView {
            campaign_id: U64(id),
            token_id: self.paper.clone(),
            assets: U128(ledger.assets),
            principal_liability: U128(ledger.principal),
            sponsor_reward_liability: U128(ledger.sponsor_reward),
            survivor_bonus_liability: U128(ledger.survivor_bonus),
            protocol_reserve: U128(ledger.protocol_reserve),
            refund_liability: U128(ledger.refund),
            dust_recorded: U128(ledger.dust_recorded),
            pending_transfer: U128(ledger.pending_transfer),
            accounting_difference: difference.to_string(),
        }
    }

    fn credit_exact(&mut self, id: u64, amount: u128, bucket: &str) {
        let mut ledger = self.ledger(id);
        ledger.assets = ledger.assets.checked_add(amount).expect("assets");
        match bucket {
            "reward" => ledger.sponsor_reward = ledger.sponsor_reward.checked_add(amount).expect("reward"),
            "principal" => ledger.principal = ledger.principal.checked_add(amount).expect("principal"),
            _ => env::panic_str("unknown credit"),
        }
        self.save_ledger(id, ledger);
    }

    fn start_transfer(
        &mut self,
        campaign_id: u64,
        account: AccountId,
        kind: TransferKind,
        amount: u128,
    ) -> Promise {
        require!(amount > 0, "nothing to transfer");
        let mut ledger = self.ledger(campaign_id);
        match kind {
            TransferKind::Principal => {
                ledger.pending_principal = ledger.pending_principal.checked_add(amount).expect("pending principal");
            }
            TransferKind::Bonus => {
                ledger.pending_bonus = ledger.pending_bonus.checked_add(amount).expect("pending bonus");
            }
            TransferKind::SponsorReward => {
                ledger.pending_reward = ledger.pending_reward.checked_add(amount).expect("pending reward");
            }
            TransferKind::Refund => {
                ledger.pending_refund = ledger.pending_refund.checked_add(amount).expect("pending refund");
            }
        }
        ledger.pending_transfer = ledger.pending_transfer.checked_add(amount).expect("pending");
        self.save_ledger(campaign_id, ledger);
        let transfer_id = self.next_transfer_id;
        self.next_transfer_id = self.next_transfer_id.checked_add(1).expect("transfer id");
        self.transfers.insert(
            transfer_id,
            PendingTransfer {
                campaign_id,
                account_id: account.clone(),
                kind,
                amount,
            },
        );
        self.emit(
            "sponsor_transfer_pending",
            json!({
                "transfer_id": transfer_id,
                "campaign_id": campaign_id,
                "account_id": account,
                "kind": Self::kind_name(kind),
                "amount": amount.to_string(),
            }),
        );
        self.pay(account, amount, transfer_id)
    }

    fn kind_name(kind: TransferKind) -> &'static str {
        match kind {
            TransferKind::Principal => "principal",
            TransferKind::Bonus => "survivor_bonus",
            TransferKind::SponsorReward => "sponsor_reward",
            TransferKind::Refund => "refund",
        }
    }

    fn pay(&self, receiver: AccountId, amount: u128, transfer_id: u64) -> Promise {
        let args = json!({
            "receiver_id": receiver,
            "amount": amount.to_string(),
            "memo": format!("paperhands-sponsor:{transfer_id}"),
        })
        .to_string()
        .into_bytes();
        Promise::new(self.paper.clone())
            .function_call(
                "ft_transfer".to_string(),
                args,
                NearToken::from_yoctonear(1),
                GAS_FT_TRANSFER,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CALLBACK)
                    .on_transfer_complete(U64(transfer_id)),
            )
    }

    fn finish_transfer(&mut self, transfer_id: u64, succeeded: bool) {
        let pending = self
            .transfers
            .remove(&transfer_id)
            .unwrap_or_else(|| env::panic_str("unknown transfer"));
        let mut ledger = self.ledger(pending.campaign_id);
        let campaign = self.campaign(pending.campaign_id);
        ledger.pending_transfer = ledger.pending_transfer.checked_sub(pending.amount).expect("pending");
        match pending.kind {
            TransferKind::Principal => {
                ledger.pending_principal = ledger.pending_principal.checked_sub(pending.amount).expect("pending principal");
            }
            TransferKind::Bonus => {
                ledger.pending_bonus = ledger.pending_bonus.checked_sub(pending.amount).expect("pending bonus");
            }
            TransferKind::SponsorReward => {
                ledger.pending_reward = ledger.pending_reward.checked_sub(pending.amount).expect("pending reward");
            }
            TransferKind::Refund => {
                ledger.pending_refund = ledger.pending_refund.checked_sub(pending.amount).expect("pending refund");
            }
        }
        if succeeded {
            ledger.assets = ledger.assets.checked_sub(pending.amount).expect("assets");
            match pending.kind {
                TransferKind::Principal => {
                    ledger.principal = ledger.principal.checked_sub(pending.amount).expect("principal");
                }
                TransferKind::Bonus => {
                    ledger.survivor_bonus = ledger.survivor_bonus.checked_sub(pending.amount).expect("bonus");
                }
                TransferKind::SponsorReward => {
                    ledger.sponsor_reward = ledger.sponsor_reward.checked_sub(pending.amount).expect("reward");
                }
                TransferKind::Refund => {
                    ledger.refund = ledger.refund.checked_sub(pending.amount).expect("refund");
                }
            }
        }
        self.save_ledger(pending.campaign_id, ledger);
        if pending.kind != TransferKind::Refund {
            let mut position = self.position(pending.campaign_id, &pending.account_id);
            match pending.kind {
                TransferKind::Principal => {
                    position.principal_pending = false;
                    if succeeded {
                        position.principal_claimed = true;
                    }
                }
                TransferKind::Bonus => {
                    position.bonus_pending = false;
                    if succeeded {
                        position.bonus_claimed = true;
                    }
                }
                TransferKind::SponsorReward => {
                    position.reward_pending = false;
                    if !succeeded && campaign.state == CampaignState::Swept {
                        // The claim window has closed. A failed in-flight reward
                        // returns to the sponsor instead of becoming claimable again.
                        let mut ledger = self.ledger(pending.campaign_id);
                        ledger.sponsor_reward = ledger.sponsor_reward.checked_sub(pending.amount).expect("swept reward");
                        ledger.refund = ledger.refund.checked_add(pending.amount).expect("swept refund");
                        self.save_ledger(pending.campaign_id, ledger);
                        position.reward_claimed = true;
                    } else if succeeded {
                        position.reward_claimed = true;
                    }
                }
                TransferKind::Refund => {}
            }
            self.positions
                .insert((pending.campaign_id, pending.account_id.clone()), position);
        }
        let event = if succeeded {
            match pending.kind {
                TransferKind::Principal => "sponsor_principal_claimed",
                TransferKind::Bonus => "sponsor_reward_claimed",
                TransferKind::SponsorReward => "sponsor_reward_claimed",
                TransferKind::Refund => "sponsor_refunded",
            }
        } else {
            "sponsor_transfer_failed"
        };
        if pending.kind == TransferKind::Bonus && succeeded {
            self.emit(
                "sponsor_survivor_bonus_claimed",
                json!({
                    "transfer_id": transfer_id,
                    "campaign_id": pending.campaign_id,
                    "account_id": pending.account_id,
                    "amount": pending.amount.to_string(),
                    "state": Self::state_name(campaign.state),
                }),
            );
        } else {
            self.emit(
                event,
                json!({
                    "transfer_id": transfer_id,
                    "campaign_id": pending.campaign_id,
                    "account_id": pending.account_id,
                    "kind": Self::kind_name(pending.kind),
                    "amount": pending.amount.to_string(),
                    "succeeded": succeeded,
                    "state": Self::state_name(campaign.state),
                }),
            );
        }
        let _ = campaign;
    }

    fn fund(&mut self, sender: AccountId, amount: u128, campaign_id: u64) -> u128 {
        require!(!self.joins_paused, "new campaign funding is paused");
        let mut campaign = self.campaign(campaign_id);
        require!(campaign.state == CampaignState::Draft, "campaign is not awaiting funds");
        require!(sender == campaign.sponsor_id, "only the sponsor can fund the campaign");
        if amount != campaign.reward_amount {
            return amount;
        }
        campaign.state = CampaignState::Funded;
        self.save_campaign(campaign_id, campaign.clone());
        self.credit_exact(campaign_id, amount, "reward");
        self.emit(
            "sponsor_campaign_funded",
            json!({
                "campaign_id": campaign_id,
                "sponsor_id": sender,
                "token_id": self.paper,
                "amount": amount.to_string(),
            }),
        );
        0
    }

    fn join(&mut self, sender: AccountId, amount: u128, campaign_id: u64) -> u128 {
        require!(!self.joins_paused, "joins are paused");
        let mut campaign = self.campaign(campaign_id);
        require!(campaign.state == CampaignState::EntryOpen, "campaign is not open for entry");
        let now = env::block_timestamp();
        require!(now >= campaign.entry_start_ns && now < campaign.entry_end_ns, "entry window is closed");
        if amount != COMMITMENT {
            return amount;
        }
        require!(
            self.positions.get(&(campaign_id, sender.clone())).is_none(),
            "account already joined or left this campaign"
        );
        require!(campaign.join_count < campaign.participant_cap, "participant cap is full");
        campaign.join_count += 1;
        campaign.active_participants += 1;
        self.save_campaign(campaign_id, campaign);
        self.positions.insert(
            (campaign_id, sender.clone()),
            Position {
                status: PositionStatus::Active,
                joined_at_ns: now,
                exited_at_ns: 0,
                principal_pending: false,
                bonus_pending: false,
                reward_pending: false,
                principal_claimed: false,
                bonus_claimed: false,
                reward_claimed: false,
            },
        );
        self.credit_exact(campaign_id, COMMITMENT, "principal");
        self.emit(
            "sponsor_participant_joined",
            json!({
                "campaign_id": campaign_id,
                "account_id": sender,
                "amount": COMMITMENT.to_string(),
                "separate_lock": true,
            }),
        );
        0
    }

    fn activate_inner(&mut self, campaign_id: u64) {
        let mut campaign = self.campaign(campaign_id);
        if campaign.state == CampaignState::Active {
            return;
        }
        require!(campaign.state == CampaignState::EntryOpen, "campaign is not in entry");
        require!(env::block_timestamp() >= campaign.entry_end_ns, "entry window is still open");
        campaign.original_participants = campaign.active_participants;
        campaign.state = CampaignState::Active;
        self.save_campaign(campaign_id, campaign.clone());
        self.emit(
            "sponsor_campaign_activated",
            json!({
                "campaign_id": campaign_id,
                "original_participants": campaign.original_participants,
            }),
        );
    }

    fn message_id(value: &Value) -> u64 {
        if let Some(id) = value.get("campaign_id").and_then(|item| item.as_u64()) {
            return id;
        }
        if let Some(text) = value.get("campaign_id").and_then(|item| item.as_str()) {
            if let Ok(id) = text.parse() {
                return id;
            }
        }
        env::panic_str("malformed sponsor message");
    }
}

#[near]
impl Contract {
    #[payable]
    #[init]
    pub fn new(
        paper_token: AccountId,
        deployment_kind: String,
        pauser: AccountId,
        token_proposer: AccountId,
        token_approver: AccountId,
    ) -> Self {
        require!(
            env::attached_deposit() >= storage_float(),
            "attach at least 0.3 NEAR to cover campaign storage"
        );
        require!(is_deployment_kind(&deployment_kind), "deployment_kind must be production or demo-testnet");
        require!(paper_token != env::current_account_id(), "paper token must be the Diamond Core contract");
        require!(token_proposer != token_approver, "token proposer and approver must differ");
        require!(pauser != token_approver, "pauser and token approver must differ");
        let mut allowed = LookupMap::new(b"t");
        allowed.insert(paper_token.clone(), true);
        Self {
            paper: paper_token,
            deployment_kind,
            pauser,
            token_proposer,
            token_approver,
            joins_paused: false,
            next_campaign_id: 1,
            next_transfer_id: 1,
            campaigns: LookupMap::new(b"a"),
            positions: LookupMap::new(b"p"),
            ledgers: LookupMap::new(b"l"),
            transfers: LookupMap::new(b"x"),
            allowed,
            pending_allowlist: None,
        }
    }

    #[payable]
    pub fn create_campaign(
        &mut self,
        name: String,
        description: String,
        link: String,
        reward_amount: U128,
        min_original: u32,
        target_retention_bps: u32,
        participant_cap: u32,
    ) -> U64 {
        self.yocto();
        require!(!self.joins_paused, "new campaigns are paused");
        let reward_amount = reward_amount.0;
        require!(reward_amount > 0, "reward pool must be funded with a positive amount");
        if let Err(message) = thresholds_ok(min_original, target_retention_bps, participant_cap) {
            env::panic_str(message);
        }
        let name = Self::bounded(name, 64, "name");
        let description = Self::bounded(description, 280, "description");
        let link = if link.trim().is_empty() {
            String::new()
        } else {
            Self::bounded(link, 120, "link")
        };
        let id = self.next_campaign_id;
        self.next_campaign_id = self.next_campaign_id.checked_add(1).expect("campaign id");
        let campaign = Campaign {
            sponsor_id: env::predecessor_account_id(),
            state: CampaignState::Draft,
            name: name.clone(),
            description,
            link,
            preset: self.deployment_kind.clone(),
            reward_amount,
            entry_start_ns: 0,
            entry_end_ns: 0,
            campaign_end_ns: 0,
            claim_deadline_ns: 0,
            min_original,
            target_retention_bps,
            participant_cap,
            join_count: 0,
            active_participants: 0,
            original_participants: 0,
            early_exits: 0,
            sponsor_share: 0,
            bonus_per_survivor: 0,
            retention_bps: 0,
            success: false,
        };
        self.save_campaign(id, campaign);
        self.save_ledger(id, Ledger::default());
        self.emit(
            "sponsor_campaign_created",
            json!({
                "campaign_id": id,
                "sponsor_id": env::predecessor_account_id(),
                "preset": self.deployment_kind,
                "reward_amount": reward_amount.to_string(),
                "min_original": min_original,
                "target_retention_bps": target_retention_bps,
                "participant_cap": participant_cap,
                "commitment_amount": COMMITMENT.to_string(),
                "name": name,
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
        U64(id)
    }

    #[payable]
    pub fn open_campaign(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let mut campaign = self.campaign(campaign_id);
        require!(env::predecessor_account_id() == campaign.sponsor_id, "only the sponsor can open the campaign");
        require!(campaign.state == CampaignState::Funded, "campaign is not funded");
        let (duration, entry) = preset_clocks(&campaign.preset).unwrap_or_else(|| env::panic_str("preset is not available"));
        let now = env::block_timestamp();
        campaign.entry_start_ns = now;
        campaign.entry_end_ns = now.checked_add(entry).expect("entry end");
        campaign.campaign_end_ns = now.checked_add(duration).expect("campaign end");
        campaign.state = CampaignState::EntryOpen;
        self.save_campaign(campaign_id, campaign.clone());
        self.emit(
            "sponsor_campaign_opened",
            json!({
                "campaign_id": campaign_id,
                "entry_start_ns": campaign.entry_start_ns,
                "entry_end_ns": campaign.entry_end_ns,
                "campaign_end_ns": campaign.campaign_end_ns,
                "preset": campaign.preset,
                "demo_clock": campaign.preset == "demo-testnet",
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn cancel_campaign(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let mut campaign = self.campaign(campaign_id);
        require!(env::predecessor_account_id() == campaign.sponsor_id, "only the sponsor can cancel");
        require!(campaign.join_count == 0, "sponsor cannot cancel after a participant joins");
        require!(
            matches!(campaign.state, CampaignState::Draft | CampaignState::Funded | CampaignState::EntryOpen),
            "campaign can no longer be cancelled"
        );
        if campaign.state != CampaignState::Draft {
            let mut ledger = self.ledger(campaign_id);
            let amount = ledger.sponsor_reward;
            ledger.sponsor_reward = 0;
            ledger.refund = ledger.refund.checked_add(amount).expect("refund");
            self.save_ledger(campaign_id, ledger);
        }
        campaign.state = CampaignState::CancelledBeforeJoin;
        self.save_campaign(campaign_id, campaign);
        self.emit(
            "sponsor_campaign_cancelled",
            json!({ "campaign_id": campaign_id }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn cancel_join(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let account = env::predecessor_account_id();
        let mut campaign = self.campaign(campaign_id);
        require!(campaign.state == CampaignState::EntryOpen, "cancellation is only open during entry");
        require!(env::block_timestamp() < campaign.entry_end_ns, "entry window is closed");
        let mut position = self.position(campaign_id, &account);
        require!(position.status == PositionStatus::Active, "position is not active");
        position.status = PositionStatus::Cancelled;
        campaign.active_participants = campaign.active_participants.checked_sub(1).expect("active");
        self.positions.insert((campaign_id, account.clone()), position);
        self.save_campaign(campaign_id, campaign);
        self.emit(
            "sponsor_participant_cancelled",
            json!({
                "campaign_id": campaign_id,
                "account_id": account,
                "amount": COMMITMENT.to_string(),
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn exit_early(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let account = env::predecessor_account_id();
        let now = env::block_timestamp();
        let mut campaign = self.campaign(campaign_id);
        require!(campaign.state == CampaignState::Active, "early exit is only open while the campaign is active");
        require!(now < campaign.campaign_end_ns, "campaign has ended");
        let mut position = self.position(campaign_id, &account);
        require!(position.status == PositionStatus::Active, "position is not active");
        let split = early_exit(COMMITMENT);
        position.status = PositionStatus::Exited;
        position.exited_at_ns = now;
        campaign.active_participants = campaign.active_participants.checked_sub(1).expect("active");
        campaign.early_exits = campaign.early_exits.checked_add(1).expect("exits");
        let mut ledger = self.ledger(campaign_id);
        let penalty = split.bonus.checked_add(split.reserve).expect("penalty");
        ledger.principal = ledger.principal.checked_sub(penalty).expect("principal");
        ledger.survivor_bonus = ledger.survivor_bonus.checked_add(split.bonus).expect("bonus");
        ledger.protocol_reserve = ledger.protocol_reserve.checked_add(split.reserve).expect("reserve");
        self.save_ledger(campaign_id, ledger);
        self.positions.insert((campaign_id, account.clone()), position);
        self.save_campaign(campaign_id, campaign);
        self.emit(
            "sponsor_participant_exited",
            json!({
                "campaign_id": campaign_id,
                "account_id": account,
                "returned": split.returned.to_string(),
                "survivor_bonus": split.bonus.to_string(),
                "protocol_reserve": split.reserve.to_string(),
                "burned": "0",
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn activate_campaign(&mut self, campaign_id: U64) {
        self.yocto();
        self.activate_inner(campaign_id.0);
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn finalize_campaign(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let now = env::block_timestamp();
        let campaign = self.campaign(campaign_id);
        if campaign.state == CampaignState::EntryOpen && now >= campaign.campaign_end_ns {
            self.activate_inner(campaign_id);
        }
        let mut campaign = self.campaign(campaign_id);
        require!(
            !matches!(
                campaign.state,
                CampaignState::FinalizedSuccess | CampaignState::FinalizedFailed | CampaignState::Swept
            ),
            "campaign is already finalized"
        );
        require!(campaign.state == CampaignState::Active, "campaign is not active");
        require!(now >= campaign.campaign_end_ns, "campaign has not ended");
        let originals = campaign.original_participants;
        let survivors = campaign.active_participants;
        let success = originals >= campaign.min_original
            && retention_met(survivors, originals, campaign.target_retention_bps);
        let retention = retention_bps(survivors, originals);
        let mut ledger = self.ledger(campaign_id);
        let bonus = equal_split(ledger.survivor_bonus, survivors);
        ledger.survivor_bonus = bonus.distributable;
        ledger.protocol_reserve = ledger.protocol_reserve.checked_add(bonus.dust).expect("reserve");
        ledger.dust_recorded = ledger.dust_recorded.checked_add(bonus.dust).expect("dust");
        let reward_dust = if success {
            let reward = equal_split(ledger.sponsor_reward, survivors);
            ledger.sponsor_reward = reward.distributable;
            ledger.refund = ledger.refund.checked_add(reward.dust).expect("reward dust");
            ledger.dust_recorded = ledger.dust_recorded.checked_add(reward.dust).expect("dust");
            reward
        } else {
            let refunded = ledger.sponsor_reward;
            ledger.sponsor_reward = 0;
            ledger.refund = ledger.refund.checked_add(refunded).expect("failure refund");
            equal_split(0, survivors)
        };
        self.save_ledger(campaign_id, ledger.clone());
        campaign.success = success;
        campaign.retention_bps = retention;
        campaign.sponsor_share = if success { reward_dust.per } else { 0 };
        campaign.bonus_per_survivor = bonus.per;
        campaign.claim_deadline_ns = now.checked_add(CLAIM_WINDOW_NS).expect("claim deadline");
        campaign.state = if success {
            CampaignState::FinalizedSuccess
        } else {
            CampaignState::FinalizedFailed
        };
        self.save_campaign(campaign_id, campaign.clone());
        self.emit(
            "sponsor_campaign_finalized",
            json!({
                "campaign_id": campaign_id,
                "success": success,
                "original_participants": originals,
                "survivors": survivors,
                "retention_bps": retention,
                "sponsor_share": campaign.sponsor_share.to_string(),
                "bonus_per_survivor": bonus.per.to_string(),
                "reward_dust": if success { reward_dust.dust.to_string() } else { "0".to_string() },
                "bonus_dust": bonus.dust.to_string(),
                "claim_deadline_ns": campaign.claim_deadline_ns,
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn claim_principal(&mut self, campaign_id: U64) -> Promise {
        let campaign_id = campaign_id.0;
        let account = env::predecessor_account_id();
        let campaign = self.campaign(campaign_id);
        let mut position = self.position(campaign_id, &account);
        let amount = self.principal_available(&campaign, &position);
        require!(amount > 0, "no principal to claim");
        position.principal_pending = true;
        self.positions.insert((campaign_id, account.clone()), position);
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(campaign_id, account, TransferKind::Principal, amount)
    }

    #[payable]
    pub fn claim_survivor_bonus(&mut self, campaign_id: U64) -> Promise {
        let campaign_id = campaign_id.0;
        let account = env::predecessor_account_id();
        let campaign = self.campaign(campaign_id);
        let mut position = self.position(campaign_id, &account);
        let amount = self.bonus_available(&campaign, &position);
        require!(amount > 0, "no survivor bonus to claim");
        position.bonus_pending = true;
        self.positions.insert((campaign_id, account.clone()), position);
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(campaign_id, account, TransferKind::Bonus, amount)
    }

    #[payable]
    pub fn claim_sponsor_reward(&mut self, campaign_id: U64) -> Promise {
        let campaign_id = campaign_id.0;
        let account = env::predecessor_account_id();
        let campaign = self.campaign(campaign_id);
        require!(campaign.state != CampaignState::Swept, "sponsor rewards were swept");
        require!(env::block_timestamp() < campaign.claim_deadline_ns, "sponsor reward claim window is closed");
        let mut position = self.position(campaign_id, &account);
        let amount = self.reward_available(&campaign, &position);
        require!(amount > 0, "no sponsor reward to claim");
        position.reward_pending = true;
        self.positions.insert((campaign_id, account.clone()), position);
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(campaign_id, account, TransferKind::SponsorReward, amount)
    }

    #[payable]
    pub fn refund_sponsor(&mut self, campaign_id: U64) -> Promise {
        let campaign_id = campaign_id.0;
        let campaign = self.campaign(campaign_id);
        let account = env::predecessor_account_id();
        require!(account == campaign.sponsor_id, "only the sponsor can refund");
        let ledger = self.ledger(campaign_id);
        let amount = ledger.refund.checked_sub(ledger.pending_refund).expect("refund");
        require!(amount > 0, "nothing to refund");
        self.refund_except(NearToken::from_yoctonear(1));
        self.start_transfer(campaign_id, account, TransferKind::Refund, amount)
    }

    #[payable]
    pub fn sweep_expired_rewards(&mut self, campaign_id: U64) {
        self.yocto();
        let campaign_id = campaign_id.0;
        let mut campaign = self.campaign(campaign_id);
        require!(
            matches!(campaign.state, CampaignState::FinalizedSuccess | CampaignState::FinalizedFailed),
            "campaign is not ready to sweep"
        );
        require!(env::block_timestamp() >= campaign.claim_deadline_ns, "claim window is still open");
        let mut ledger = self.ledger(campaign_id);
        let sweepable = ledger.sponsor_reward.checked_sub(ledger.pending_reward).expect("sweep");
        ledger.sponsor_reward = ledger.pending_reward;
        ledger.refund = ledger.refund.checked_add(sweepable).expect("sweep refund");
        let principal = ledger.principal;
        self.save_ledger(campaign_id, ledger.clone());
        require!(self.ledger(campaign_id).principal == principal, "sweep touched principal");
        campaign.state = CampaignState::Swept;
        self.save_campaign(campaign_id, campaign);
        self.emit(
            "sponsor_claims_swept",
            json!({
                "campaign_id": campaign_id,
                "swept_to_sponsor": sweepable.to_string(),
                "principal_untouched": principal.to_string(),
            }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn pause_new_joins(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser can pause joins");
        self.joins_paused = true;
        self.emit("sponsor_joins_paused", json!({ "pauser": self.pauser }));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn resume_new_joins(&mut self) {
        self.yocto();
        require!(env::predecessor_account_id() == self.pauser, "only the pauser can resume joins");
        self.joins_paused = false;
        self.emit("sponsor_joins_resumed", json!({ "pauser": self.pauser }));
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn propose_token_allowlist(&mut self, token_id: AccountId, enabled: bool) {
        self.yocto();
        require!(env::predecessor_account_id() == self.token_proposer, "only the token proposer");
        if token_id == self.paper {
            require!(enabled, "PAPER cannot be removed from the allowlist");
        }
        self.pending_allowlist = Some(AllowProposal { token_id: token_id.clone(), enabled });
        self.emit(
            "sponsor_allowlist_proposed",
            json!({ "token_id": token_id, "enabled": enabled }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[payable]
    pub fn approve_token_allowlist(&mut self, token_id: AccountId, enabled: bool) {
        self.yocto();
        let approver = env::predecessor_account_id();
        require!(approver == self.token_approver, "only the token approver");
        require!(approver != self.token_proposer, "approver must differ from the proposer");
        let pending = self.pending_allowlist.take().unwrap_or_else(|| env::panic_str("no allowlist proposal"));
        require!(pending.token_id == token_id && pending.enabled == enabled, "proposal does not match");
        if token_id == self.paper {
            require!(enabled, "PAPER cannot be removed from the allowlist");
        }
        self.allowed.insert(token_id.clone(), enabled);
        self.emit(
            "sponsor_allowlist_updated",
            json!({ "token_id": token_id, "enabled": enabled, "transfers_accepted": token_id == self.paper && enabled }),
        );
        self.refund_except(NearToken::from_yoctonear(0));
    }

    #[private]
    pub fn on_transfer_complete(
        &mut self,
        transfer_id: U64,
        #[callback_result] result: Result<(), PromiseError>,
    ) {
        self.finish_transfer(transfer_id.0, result.is_ok());
    }

    pub fn get_campaign(&self, campaign_id: U64) -> CampaignView {
        let campaign = self.campaign(campaign_id.0);
        self.view_campaign(campaign_id.0, &campaign)
    }

    pub fn get_participant(&self, campaign_id: U64, account_id: AccountId) -> Option<ParticipantView> {
        let campaign = self.campaigns.get(&campaign_id.0)?.clone();
        let position = self.positions.get(&(campaign_id.0, account_id.clone()))?.clone();
        Some(self.participant_view(account_id, &campaign, &position))
    }

    pub fn get_campaign_accounting(&self, campaign_id: U64) -> AccountingView {
        self.accounting_view(campaign_id.0, &self.ledger(campaign_id.0))
    }

    pub fn get_allowed_tokens(&self) -> Vec<TokenView> {
        vec![TokenView {
            token_id: self.paper.clone(),
            enabled: self.allowed.get(&self.paper).copied().unwrap_or(false),
            transfers_accepted: true,
        }]
    }

    pub fn get_protocol_config(&self) -> ProtocolConfigView {
        ProtocolConfigView {
            paper_token: self.paper.clone(),
            deployment_kind: self.deployment_kind.clone(),
            demo_clock: self.deployment_kind == "demo-testnet",
            commitment_amount: U128(COMMITMENT),
            min_originals: conviction::MIN_ORIGINALS,
            min_retention_bps: conviction::MIN_RETENTION_BPS,
            max_participant_cap: conviction::MAX_PARTICIPANT_CAP,
            claim_window_ns: U64(CLAIM_WINDOW_NS),
            protocol_fee_bps: 0,
            joins_paused: self.joins_paused,
            pauser: self.pauser.clone(),
            token_proposer: self.token_proposer.clone(),
            token_approver: self.token_approver.clone(),
            early_exit_burned: false,
            next_campaign_id: U64(self.next_campaign_id),
        }
    }

    pub fn get_transfer(&self, transfer_id: U64) -> Option<TransferView> {
        self.transfers.get(&transfer_id.0).cloned().map(|pending| TransferView {
            transfer_id,
            campaign_id: U64(pending.campaign_id),
            account_id: pending.account_id,
            kind: Self::kind_name(pending.kind).to_string(),
            amount: U128(pending.amount),
        })
    }

    pub fn list_campaigns(&self, from_index: U64, limit: U64) -> Vec<CampaignView> {
        let limit = limit.0.min(50);
        let mut views = Vec::new();
        let mut id = from_index.0.max(1);
        while views.len() < limit as usize && id < self.next_campaign_id {
            if let Some(campaign) = self.campaigns.get(&id) {
                views.push(self.view_campaign(id, campaign));
            }
            id += 1;
        }
        views
    }
}

#[near]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.paper, "token contract is not PAPER");
        require!(
            self.allowed.get(&self.paper).copied().unwrap_or(false),
            "PAPER is not allowlisted"
        );
        let parsed: Value = near_sdk::serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("malformed sponsor message"));
        let action = parsed
            .get("action")
            .and_then(|item| item.as_str())
            .unwrap_or_else(|| env::panic_str("malformed sponsor message"));
        let campaign_id = Self::message_id(&parsed);
        let unused = match action {
            "fund_reward" => self.fund(sender_id, amount.0, campaign_id),
            "join" => self.join(sender_id, amount.0, campaign_id),
            _ => env::panic_str("unsupported sponsor message"),
        };
        PromiseOrValue::Value(U128(unused))
    }
}
