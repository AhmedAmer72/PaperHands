import { viewAt } from "./chain";

export type SponsorConfig = {
  paper_token: string;
  deployment_kind: string;
  demo_clock: boolean;
  commitment_amount: string;
  min_originals: number;
  min_retention_bps: number;
  max_participant_cap: number;
  claim_window_ns: string;
  protocol_fee_bps: number;
  joins_paused: boolean;
  early_exit_burned: boolean;
  next_campaign_id: string;
};

export type CampaignView = {
  campaign_id: string;
  sponsor_id: string;
  state: string;
  name: string;
  description: string;
  link: string;
  preset: string;
  demo_clock: boolean;
  separate_lock: boolean;
  commitment_amount: string;
  reward_amount: string;
  reward_token: string;
  entry_end_ns: string;
  campaign_end_ns: string;
  claim_deadline_ns: string;
  min_original: number;
  target_retention_bps: number;
  participant_cap: number;
  join_count: number;
  active_participants: number;
  original_participants: number;
  early_exits: number;
  success: boolean | null;
  retention_bps: number;
  sponsor_share: string;
  bonus_per_survivor: string;
  rewards_swept: boolean;
  early_exit_is_burn: boolean;
};

export type AccountingView = {
  assets: string;
  principal_liability: string;
  sponsor_reward_liability: string;
  survivor_bonus_liability: string;
  protocol_reserve: string;
  refund_liability: string;
  dust_recorded: string;
  pending_transfer: string;
  accounting_difference: string;
};

export type ParticipantView = {
  status: string;
  principal_available: string;
  bonus_available: string;
  sponsor_reward_available: string;
  principal_pending: boolean;
  bonus_pending: boolean;
  sponsor_reward_pending: boolean;
};

export type MissionView = {
  mission_id: string;
  sponsor_id: string;
  reviewer_id: string;
  escalation_id: string;
  state: string;
  objective: string;
  scope: string;
  criteria: string;
  payout_each: string;
  max_acceptances: number;
  assigned: number;
  deadline_ns: string;
  demo_clock: boolean;
};

export type ProposalView = {
  proposal_id: string;
  proposer: string;
  beneficiary: string;
  amount: string;
  milestone: string;
  evidence: string;
  approvals: string[];
  ready_at_ns: string;
  executed: boolean;
  pending: boolean;
};

export type TreasuryBooks = {
  assets: string;
  available: string;
  reserved: string;
  pending: string;
  accounting_difference: string;
  timelock_ns: string;
  demo_clock: boolean;
  paused: boolean;
};

export function sponsorConfig(contractId: string) {
  return viewAt<SponsorConfig>(contractId, "get_protocol_config");
}

export function listCampaigns(contractId: string) {
  return viewAt<CampaignView[]>(contractId, "list_campaigns", { from_index: "1", limit: "50" });
}

export function campaign(contractId: string, campaignId: string) {
  return viewAt<CampaignView>(contractId, "get_campaign", { campaign_id: campaignId });
}

export function campaignBooks(contractId: string, campaignId: string) {
  return viewAt<AccountingView>(contractId, "get_campaign_accounting", { campaign_id: campaignId });
}

export function participant(contractId: string, campaignId: string, accountId: string) {
  return viewAt<ParticipantView | null>(contractId, "get_participant", { campaign_id: campaignId, account_id: accountId });
}

export function listMissions(contractId: string) {
  return viewAt<MissionView[]>(contractId, "list_missions", { from_index: "1", limit: "50" });
}

export function mission(contractId: string, missionId: string) {
  return viewAt<MissionView>(contractId, "get_mission", { mission_id: missionId });
}

export function listProposals(contractId: string) {
  return viewAt<ProposalView[]>(contractId, "list_proposals", { from_index: "1", limit: "50" });
}

export function proposal(contractId: string, proposalId: string) {
  return viewAt<ProposalView>(contractId, "get_proposal", { proposal_id: proposalId });
}

export function treasuryBooks(contractId: string) {
  return viewAt<TreasuryBooks>(contractId, "get_accounting");
}

export function wholeToRaw(whole: string): string | null {
  if (!/^\d+$/.test(whole) || whole === "0") return null;
  return (BigInt(whole) * 100_000_000n).toString();
}
