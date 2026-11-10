#!/usr/bin/env bash
# Read-only views against a PAPERHANDS deployment. No state changes.
set -euo pipefail

network="${PAPERHANDS_NETWORK:-testnet}"
rpc="${PAPERHANDS_RPC_URL:-https://rpc.testnet.near.org}"
contract="${PAPERHANDS_CONTRACT_ID:-${NEXT_PUBLIC_CONTRACT_ID:-}}"

if [[ "$network" != "testnet" || "$rpc" == *mainnet* ]]; then
  echo "Refusing network '$network' rpc '$rpc'."
  exit 1
fi

if [[ -z "$contract" ]]; then
  echo "No PAPERHANDS_CONTRACT_ID. Nothing to query."
  echo "After a Testnet deploy, this script calls ft_metadata, ft_total_supply, get_config, get_faucet_status."
  echo "Expected demo values: symbol PAPER, supply 100000000000000, epoch 3600000000000 ns, sybil_resistant false."
  exit 0
fi

view() {
  local method="$1"
  echo "---- $method ----"
  curl --silent --show-error --fail "$rpc" \
    -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":\"paperhands\",\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"account_id\":\"$contract\",\"method_name\":\"$method\",\"args_base64\":\"e30=\",\"finality\":\"final\"}}" \
    | python3 -c 'import json,sys,base64; r=json.load(sys.stdin); res=r.get("result",{}); raw=bytes(res.get("result",[])); print(raw.decode() if raw else json.dumps(r))'
}

view ft_metadata
view ft_total_supply
view get_config
view get_faucet_status
echo "Read complete. sybil_resistant false means the faucet is not Sybil-proof."
