import { JsonRpcProvider } from "near-api-js";
import { CONTRACT_ID, RPC_URL } from "./config";

export function provider() {
  return new JsonRpcProvider({ url: RPC_URL });
}

export function contractReady(): string | null {
  if (!CONTRACT_ID) return "Contract is not connected. Set NEXT_PUBLIC_CONTRACT_ID. No seven-day production epoch is assumed.";
  return null;
}

export async function viewAt<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!contractId) throw new Error("That contract is not configured. No transaction was sent.");
  const result = await provider().callFunction({ contractId, method, args });
  if (result === undefined) throw new Error(`${method} returned an empty result`);
  return result as T;
}

export async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const missing = contractReady();
  if (missing) throw new Error(missing);
  const result = await provider().callFunction({
    contractId: CONTRACT_ID,
    method,
    args,
  });
  if (result === undefined) throw new Error(`${method} returned an empty result`);
  return result as T;
}

export type CurrentEpoch = {
  deployment_kind: string;
  epoch_duration_ns: string;
  entry_window_ns: string;
  faucet_enabled: boolean;
  epoch_id: string;
  start_ns: string;
  entry_end_ns: string;
  end_ns: string;
  now_ns: string;
  phase: string;
  next_epoch_to_finalize: string;
  current_streak: number;
  longest_streak: number;
};

export type ProtocolBalances = {
  contract_token_balance: string;
  burn_reserve: string;
  faucet_reserve: string;
  locked_principal: string;
  unclaimed_mint_rewards: string;
  unclaimed_exit_bonuses: string;
  accounting_difference: string;
  total_supply: string;
  total_graded_minted: string;
  total_exit_burned: string;
  total_reserve_burned: string;
  total_dust_burned: string;
  total_swept_burned: string;
};

export type EpochDetail = {
  epoch_id: string;
  phase: string;
  original_participants: number | null;
  active_participants: number;
  early_exits: number;
  locked_principal: string;
  survivor_bonus_pool: string;
  exit_burned: string;
  finalized: boolean;
  success: boolean | null;
  retention_bps: number | null;
  projected_success: boolean | null;
  minted: string;
  reward_per_survivor: string;
  bonus_per_survivor: string;
  reserve_burned: string;
  dust_burned: string;
  finalized_at_ns: string | null;
  reward_claim_deadline_ns: string | null;
  unclaimed_mint_remaining: string;
  unclaimed_bonus_remaining: string;
  rewards_swept: boolean;
  start_ns: string;
  entry_end_ns: string;
  end_ns: string;
};

export type UserEpochState = {
  status: string | null;
  stored_status: string | null;
  rewards_claimed: boolean;
  claimable_principal: string;
  claimable_mint: string;
  claimable_bonus: string;
  principal_claim_open: boolean;
  rewards_claim_open: boolean;
};

export async function confirmTransaction(txHash: string, accountId: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await provider().viewTransactionStatus({
      txHash,
      accountId,
      waitUntil: "FINAL",
    });
    const status = (response as { status?: unknown; final_execution_status?: unknown }).status
      ?? (response as { final_execution_status?: unknown }).final_execution_status;
    const detail = JSON.stringify(status ?? response);
    const record = status && typeof status === "object" ? status as Record<string, unknown> : null;
    const ok = Boolean(record && "SuccessValue" in record && !("Failure" in record));
    return {
      ok,
      detail: ok ? "RPC reports SuccessValue." : `RPC did not report SuccessValue. ${detail}`,
    };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}
