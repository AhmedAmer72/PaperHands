import { CONTRACT_ID } from "./config";

const SELF_MOVE = new Set([
  "claim_testnet_faucet",
  "join_epoch",
  "cancel_during_entry",
  "exit_early",
  "claim_principal",
  "claim_epoch_rewards",
  "ft_transfer",
  "ft_transfer_call",
]);

export const CONTRACT_ACCOUNT_NOTE =
  "This wallet is the PAPER contract. A transfer from an account to itself is rejected. Connect a different Testnet account.";

export function contractAccountMove(accountId: string | null, method: string): string | null {
  if (!accountId || !CONTRACT_ID || accountId !== CONTRACT_ID) return null;
  if (!SELF_MOVE.has(method)) return null;
  return `${CONTRACT_ACCOUNT_NOTE} No transaction was sent.`;
}

export function readableTxError(raw: string): string {
  const match = raw.match(/Smart contract panicked:\s*([^"\\}]+)/);
  const panic = match?.[1]?.trim();
  if (!panic) return raw;
  if (panic === "Sender and receiver should be different") return CONTRACT_ACCOUNT_NOTE;
  const next = panic.match(/^epochs finalize in order; next epoch is (\d+)$/);
  if (next) return `Epochs finalize in order. The next epoch is ${next[1]}. Open that epoch after it has ended.`;
  if (panic === "epoch is not finalized") return "This epoch is not finalized. Claims stay closed until it is finalized, in order.";
  if (panic === "epoch has not ended") return "This epoch has not ended.";
  if (panic === "entry window is closed") return "The entry window is closed.";
  if (panic === "early exit opens after the entry window closes") return "Early exit opens after the entry window closes.";
  if (panic === "epoch has ended") return "This epoch has ended.";
  if (panic === "account already joined or left this epoch") return "This account already joined or left this epoch.";
  if (panic === "faucet already claimed for this account") return "This account already claimed the faucet.";
  if (panic === "faucet is disabled on this deployment") return "This deployment has the faucet off.";
  if (panic === "no commitment for this epoch") return "This account has no lock in this epoch.";
  if (panic === "only an unclaimed survivor can claim principal") return "Only an unclaimed survivor can claim principal.";
  if (panic === "only a survivor can claim rewards") return "Only a survivor can claim rewards.";
  if (panic === "rewards already claimed") return "Rewards were already claimed.";
  if (panic === "no rewards to claim") return "There are no rewards to claim.";
  if (panic === "reward claim window is still open") return "The reward claim window is still open.";
  if (panic === "reward claim window has closed") return "The reward claim window has closed.";
  if (panic === "unclaimed rewards were swept" || panic === "unclaimed rewards already swept") return "Unclaimed rewards were already swept.";
  return panic.endsWith(".") ? panic : `${panic}.`;
}
