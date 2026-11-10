#!/usr/bin/env bash
# Build the PAPERHANDS wasm. Does not deploy and does not touch a network.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/contracts/paperhands"

if ! command -v cargo-near >/dev/null 2>&1 && ! cargo near --version >/dev/null 2>&1; then
  echo "cargo-near is not installed. Install it, then rerun this script."
  echo "Sandbox tests build with cargo-near-build instead. See docs/DEPENDENCIES.md."
  exit 1
fi

# wasm-opt (binaryen) is required by `cargo near build` for the optimized
# artifact. This environment did not have it. The command is still the one
# to run on a machine that does.
if ! command -v wasm-opt >/dev/null 2>&1; then
  echo "wasm-opt is not on PATH. Install binaryen, then rerun."
  echo "Without it, this script will not write target/near/*.wasm."
  exit 1
fi

cargo near build non-reproducible-wasm --locked
echo "Wasm is under contracts/paperhands/target/near/"
