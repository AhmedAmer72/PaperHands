# Test plan

Run from the repository root unless a command says otherwise.

## Contract unit tests

```bash
cd contracts/paperhands && cargo test --lib --offline
```

Covers the ten-row retention table (25/25, 25/22, 25/20, 25/19, 32/26, 32/25, 40/32, 40/30, 24/24, 0/0), the 950/25/25 split, bonus dust, empty epochs through the 300,000 PAPER reserve, the 32/7 worked example, claims, the sweep boundary, faucet caps, init pairs, and the accounting difference. The storage test prints 274 bytes on the first join and 67 bytes after that.

## Sandbox

```bash
cd contracts/paperhands && cargo test --test test_basics --offline -- --test-threads=1 --nocapture
```

Three tests: penalty and claims, an empty epoch plus the demo clock against a production clock, and a 25-account success followed by a four-account epoch whose bonus remainder is 1 unit. The wasm build sets `no_wasmopt` because binaryen is not installed. `scripts/build-contract.sh` passes the same `--no-wasmopt` flag. This suite downloads or reuses a local NEAR sandbox and takes about ten minutes.

## Simulator

```bash
cd simulator && npm test
```

Scenario A ends at 1,004,000 PAPER. Scenario C ends at 995,800 PAPER. Scenario B's published supply formats as `1000999.99999990`. See `docs/ECONOMIC_INVARIANTS.md` for why that is not the sum of every exit burn.

## Frontend

```bash
cd frontend && npm run build
```

Webpack build. Turbopack 15.5.29 does not resolve `paperhands-simulator`. The lab page is server-rendered from the simulator. With no `NEXT_PUBLIC_CONTRACT_ID`, pages say the contract is not connected and do not present a demo clock as a 7 day production epoch.

## Not run here

No Testnet deploy, no funded account, no Mainnet call, and no live wallet signature. `scripts/demo-testnet.sh` without `PAPERHANDS_EXECUTE=1` only prints the plan.
