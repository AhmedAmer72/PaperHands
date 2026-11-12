#!/usr/bin/env bash
# Build the PAPERHANDS release wasm. Does not deploy and does not touch a network.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/contracts/paperhands"

if ! command -v cargo-near >/dev/null 2>&1 && ! cargo near --version >/dev/null 2>&1; then
  echo "cargo-near is not installed. Install it, then rerun this script."
  exit 1
fi

# Sandbox tests pass BuildOpts::no_wasmopt(true) because binaryen is not
# installed on this machine. The same flag here skips the wasm-opt post-step
# and still writes the release artifact. Those sandbox tests executed the
# resulting wasm.
cargo near build non-reproducible-wasm --locked --no-wasmopt

echo "Wasm:"
find target/near -name '*.wasm' -printf '%p %s bytes\n'
