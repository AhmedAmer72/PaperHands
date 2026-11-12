# PAPERHANDS

A NEAR fungible token and a single commitment protocol. Lock 1,000 PAPER for one epoch. Stay, and you can claim that principal plus an equal share of the epoch's mint and of the early-exit bonuses. Leave after the entry window and you get 950 back: 25 is burned and 25 is assigned to whoever stays.

This repository is the Testnet MVP. The demo contract is deployed at `diabloodevs.testnet`. Init minted 1,000,000 PAPER (raw `100000000000000`, 8 decimals) under NEP-141. The faucet is not Sybil-proof: one person can use many Testnet accounts.

Demo init and production init are different clocks. A `demo-testnet` deployment uses a **1 hour** epoch and a **10 minute** entry window. That is not a 7 day production epoch. Production init is 7 days and 24 hours, with the faucet off. Nothing in the contract changes those parameters after init.

## Judge path

What you can run in this repo today. The demo deploy below is the one transaction pair that was sent to Testnet.

| Command | Action | Result |
| --- | --- | --- |
| `cd contracts/paperhands && cargo test --lib --offline` | Run the settlement, penalty, dust, claim, and accounting tests. | 37 unit tests pass. No chain call. |
| `cd contracts/paperhands && cargo test --test test_basics --offline -- --test-threads=1` | Run the sandbox: 950/25/25, a 25-account success, an empty epoch, and a 1-unit dust split. | 3 sandbox tests pass. Local sandbox only. |
| `cd simulator && npm test` | Run scenarios A, B, and C. | A ends at 1,004,000 PAPER. C ends at 995,800. B's published supply is `1000999.99999990` because 10 smallest units of bonus dust are burned. |
| `scripts/demo-testnet.sh` | Print the Testnet plan. | Exits 0. Sends nothing. Refuses mainnet. |
| `PAPERHANDS_CONTRACT_ID=diabloodevs.testnet scripts/verify-views.sh` | Read `ft_metadata`, supply, `get_economic_config`, faucet status. | Demo: symbol `PAPER`, supply `100000000000000`, epoch duration `3600000000000` (1 hour), `sybil_resistant: false`. |

On-chain actions, once a demo deployment exists. The script does not create the account.

| Action | On-chain result |
| --- | --- |
| `storage_deposit`, then `claim_testnet_faucet` | Balance becomes 1,000 PAPER. A second claim fails with `faucet already claimed`. |
| `join_epoch` during the entry window | 1,000 PAPER moves from the account to the contract. |
| `exit_early` after entry closes and before the epoch ends | The account receives 950 PAPER. Supply falls by 25 PAPER. |
| `finalize_epoch` after the epoch ends | The epoch record shows original count, survivors, success or failure, mint, reserve burn, and dust. |
| Survivor `claim_epoch_rewards`, then `claim_principal` | Rewards pay the equal mint share plus the equal bonus. Principal returns 1,000 PAPER and does not expire. |

## Storage the wallet will be asked for

Measured in the unit tests, at the protocol storage price of 10^19 yoctoNEAR per byte:

| Record | Bytes | NEAR |
| --- | --- | --- |
| First join of an epoch | 274 | 0.00274 |
| Each later commitment | 67 | 0.00067 |

The app attaches 0.1 NEAR and the contract refunds the unused part. The commitment record stays after cancel and after claims. That NEAR storage stake is not returned. The confirm dialog says this before a wallet opens.

## Layout

```text
contracts/paperhands/    Rust contract, unit tests, sandbox tests
frontend/                Next.js app, eight routes
simulator/               Integer scenarios A, B, and C
scripts/                 build, dry-run demo, read-only views
docs/                    rules, invariants, Sybil limits, deploy notes, visual audit
design-reference/        Phamily Pharma files kept for analysis, not used by the app
```

Pages: `/`, `/how-it-works`, `/commitment`, `/paperhands-index`, `/epoch/[id]`, `/economy`, `/explorer`, `/lab`, `/rules`, `/faq`, plus V3 routes `/sponsors`, `/missions`, `/treasury`, and `/profile/[accountId]`. The lab chart is labeled SIMULATION. It is not Testnet history.

V3 adds SponsorHub, MissionHub, and Treasury beside the deployed Diamond Core. A sponsor campaign locks another 1,000 PAPER. It does not join the Diamond epoch. Demo campaigns last 1 hour. Production campaigns last 7 days. The early-exit 25 PAPER inside SponsorHub is a protocol reserve, not a burn. The demo contracts are `sponsor.diabloodevs.testnet`, `missions.diabloodevs.testnet`, and `treasury.diabloodevs.testnet`. They do not replace the Diamond Core wasm. See [docs/V3_DECISIONS.md](docs/V3_DECISIONS.md), [docs/V3_THREAT_MODEL.md](docs/V3_THREAT_MODEL.md), and [docs/V3_TESTNET_REPORT.md](docs/V3_TESTNET_REPORT.md).

## Status of this build

Re-run on 11 Nov 2026: `cargo test --lib` (38), `cargo test --test test_basics` (3), `npm test` in `simulator` (5).

Deployed on Testnet as `diabloodevs.testnet`, demo init only. The code hash matches the local wasm. Epoch 23 finished on Testnet: 25 accounts joined, one exited early for 950 PAPER, finalize minted 240 PAPER, and the 24 survivors claimed principal and rewards. Accounting difference stayed `0`. The full-access key on the contract account is still there, so the wasm can still be replaced. Do not call this production-ready or permanently immutable.

Reports: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), [docs/TEST_REPORT.md](docs/TEST_REPORT.md), [docs/TESTNET_ACCOUNTS.md](docs/TESTNET_ACCOUNTS.md), [docs/TESTNET_E2E_REPORT.md](docs/TESTNET_E2E_REPORT.md), [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md), [docs/SYBIL_LIMITATIONS.md](docs/SYBIL_LIMITATIONS.md).

Pins: `near-sdk` `=5.30.1` and `near-contract-standards` `=5.30.1`. See [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).

License: MIT OR Apache-2.0. See [LICENSE](LICENSE).

## Judge path on Testnet

The live clock is a **1 hour** epoch and a **10 minute** entry window. That is the demo deployment, not the 7 day production clock.

1. Open the app and connect a Testnet wallet. The contract id is `diabloodevs.testnet`.
2. On Commitment, confirm the checkbox, register storage, then claim the faucet once. The balance becomes 1,000 PAPER. A second claim fails.
3. Join while the page says the phase is `entry`. The wallet attaches 0.1 NEAR. The contract locks 1,000 PAPER.
4. After entry closes, Early exit returns 950 PAPER, burns 25, and books 25 for survivors.
5. After the hour, anyone can finalize the next ended epoch. Empty epochs that nobody joined burn 250 PAPER from the burn reserve, in order, before a later epoch can be finalized.
6. Survivors claim principal (1,000 PAPER, no expiry) and claim rewards (equal mint plus equal bonus) on the epoch page.
7. Activity shows a hash only after the RPC says `SuccessValue`, or from a hash you look up. The lab chart is labeled SIMULATION.

The 25-account run is one operator. Read [docs/SYBIL_LIMITATIONS.md](docs/SYBIL_LIMITATIONS.md) next to those results. Hashes for that run are in [docs/TESTNET_E2E_REPORT.md](docs/TESTNET_E2E_REPORT.md).

## Visual design

The landing page is a cream, forest, and pink editorial layout. The reference audit is [docs/design-audit.md](docs/design-audit.md). Tokens live in [docs/design-system.md](docs/design-system.md) and `frontend/app/globals.css`. What changed, and what was actually checked, is [docs/visual-implementation.md](docs/visual-implementation.md). Phamily artwork stays in `design-reference/` and is not part of the product.
