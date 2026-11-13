import { JsonRpcProvider } from "near-api-js";
import { CONTRACT_ID, NETWORK, RPC_URL } from "./config";

const PUBLIC_TESTNET_RPC = "https://rpc.testnet.near.org";
const FASTNEAR_TESTNET_RPC = "https://test.rpc.fastnear.com";

const readFallback = NETWORK === "testnet"
  ? (RPC_URL === PUBLIC_TESTNET_RPC ? PUBLIC_TESTNET_RPC : FASTNEAR_TESTNET_RPC)
  : "";

let readUrl = NETWORK === "testnet" && RPC_URL === PUBLIC_TESTNET_RPC ? FASTNEAR_TESTNET_RPC : RPC_URL;

export function provider() {
  return new JsonRpcProvider({ url: readUrl });
}

async function callFunction<T>(contractId: string, method: string, args: Record<string, unknown>): Promise<T> {
  const urls = [readUrl];
  if (readFallback && readFallback !== readUrl && !urls.includes(readFallback)) urls.push(readFallback);
  let last: unknown;
  for (const url of urls) {
    try {
      const result = await new JsonRpcProvider({ url }).callFunction({ contractId, method, args });
      if (result === undefined) throw new Error(`${method} returned an empty result`);
      readUrl = url;
      return result as T;
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function contractReady(): string | null {
  if (!CONTRACT_ID) return "Contract is not connected. Set NEXT_PUBLIC_CONTRACT_ID. No seven-day production epoch is assumed.";
  return null;
}

export async function viewAt<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!contractId) throw new Error("That contract is not configured. No transaction was sent.");
  return callFunction<T>(contractId, method, args);
}

export async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const missing = contractReady();
  if (missing) throw new Error(missing);
  return callFunction<T>(CONTRACT_ID, method, args);
}

export async function viewEpochs(firstId: number, lastId: number): Promise<EpochDetail[]> {
  if (!Number.isInteger(firstId) || !Number.isInteger(lastId) || firstId < 0 || lastId < firstId) return [];
  const rows: EpochDetail[] = [];
  const size = 6;
  for (let start = firstId; start <= lastId; start += size) {
    const ids: number[] = [];
    for (let id = start; id <= Math.min(lastId, start + size - 1); id += 1) ids.push(id);
    const batch = await Promise.all(ids.map((id) => view<EpochDetail>("get_epoch", { epoch_id: String(id) })));
    rows.push(...batch);
  }
  return rows;
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
