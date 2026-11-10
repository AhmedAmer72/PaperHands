#!/usr/bin/env bash
# Print the Testnet demo plan. Deploy only when the owner opts in.
# Never creates accounts, never funds them, never deletes access keys,
# and never talks to mainnet.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
network="${PAPERHANDS_NETWORK:-testnet}"
rpc="${PAPERHANDS_RPC_URL:-https://rpc.testnet.near.org}"

if [[ "$network" != "testnet" || "$rpc" == *mainnet* ]]; then
  echo "Refusing network '$network' rpc '$rpc'. This script is Testnet only."
  exit 1
fi

contract="${PAPERHANDS_CONTRACT_ID:-}"
signer="${PAPERHANDS_SIGNER_ID:-$contract}"
show_contract="${contract:-<PAPERHANDS_CONTRACT_ID>}"
show_signer="${signer:-<PAPERHANDS_SIGNER_ID>}"
wasm="$root/contracts/paperhands/target/near/paperhands.wasm"

demo_args='{"epoch_duration_ns":"3600000000000","entry_window_ns":"600000000000","faucet_enabled":true,"deployment_kind":"demo-testnet"}'
prod_args='{"epoch_duration_ns":"604800000000000","entry_window_ns":"86400000000000","faucet_enabled":false,"deployment_kind":"production"}'

cat <<EOF
PAPERHANDS demo plan. No transaction is sent unless PAPERHANDS_EXECUTE=1.

Network: testnet
RPC: $rpc
Contract account: $show_contract
Signer: $show_signer
Wasm: $wasm

This init is demo-testnet: 1 hour epochs, 10 minute entry, faucet on.
It is not a 7 day production epoch. The faucet is not Sybil-proof.
One person can claim 1,000 PAPER on many Testnet accounts.

Steps, after the owner has an existing funded Testnet account and a wasm:
  1. near contract deploy $show_signer use-file $wasm without-init-call \\
       network-config testnet sign-with-keychain send
  2. near contract call-function as-transaction $show_signer new \\
       json-args '$demo_args' prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \\
       sign-as $show_signer network-config testnet sign-with-keychain send
  3. PAPERHANDS_CONTRACT_ID=$show_signer $root/scripts/verify-views.sh
  4. Each demo account: storage_deposit, then claim_testnet_faucet once.
  5. join_epoch while the entry window is open (attach at least 0.1 NEAR).
  6. After 10 minutes, exit_early returns 950 PAPER, burns 25, assigns 25.
  7. After 1 hour, finalize_epoch. Survivors claim rewards, then principal.

Production init, not used by this demo:
  json-args '$prod_args'

This script does not create accounts and does not delete keys.
EOF

if [[ "${PAPERHANDS_EXECUTE:-}" != "1" ]]; then
  echo
  echo "Dry run. Set PAPERHANDS_EXECUTE=1 to send the deploy and demo init."
  exit 0
fi

if [[ -z "$contract" || -z "$signer" ]]; then
  echo "PAPERHANDS_EXECUTE=1 requires PAPERHANDS_CONTRACT_ID and PAPERHANDS_SIGNER_ID."
  exit 1
fi
if [[ ! -f "$wasm" ]]; then
  echo "Missing $wasm. Run scripts/build-contract.sh first."
  exit 1
fi
if ! command -v near >/dev/null 2>&1; then
  echo "near-cli-rs (the 'near' binary) is not installed."
  exit 1
fi

echo "Executing Testnet deploy and demo init. Keys are not deleted."
near contract deploy "$signer" use-file "$wasm" without-init-call \
  network-config testnet sign-with-keychain send
near contract call-function as-transaction "$signer" new \
  json-args "$demo_args" prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  sign-as "$signer" network-config testnet sign-with-keychain send
echo "Deploy submitted. Confirm the receipt on the explorer. This script does not print a fabricated hash."
