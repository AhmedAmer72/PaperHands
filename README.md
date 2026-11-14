# PAPERHANDS

A NEAR fungible token and a single commitment protocol. Lock 1,000 PAPER for one epoch. Stay, and you can claim that principal plus an equal share of the epoch's mint and of the early-exit bonuses. Leave after the entry window and you get 950 back: 25 is burned and 25 is assigned to whoever stays.

This repository is the Testnet MVP. The demo contract is deployed at `diabloodevs.testnet`. Init minted 1,000,000 PAPER (raw `100000000000000`, 8 decimals) under NEP-141. The faucet is not Sybil-proof: one person can use many Testnet accounts.

Demo init and production init are different clocks. A `demo-testnet` deployment uses a **1 hour** epoch and a **10 minute** entry window. That is not a 7 day production epoch. Production init is 7 days and 24 hours, with the faucet off. Nothing in the contract changes those parameters after init.

## Judge path

What you can run in this repo today. The demo deploy below is the one transaction pair that was sent to Testnet.

| Command | Action | Result |
| --- | --- | --- |
| `cd contracts/paperhands && cargo test --lib --locked --offline` | Run the settlement, penalty, dust, claim, and accounting tests. | 38 unit tests pass. No chain call. |
| `cd contracts/paperhands && cargo test --test test_basics --locked -- --test-threads=1` | Run the sandbox: 950/25/25, a 25-account success, an empty epoch, and a 1-unit dust split. | 3 sandbox tests passed on 14 Nov 2026. Local sandbox only. Needs `cargo-near` on `PATH`. |
| `cd simulator && npm test` | Run scenarios A, B, and C. | A ends at 1,004,000 PAPER. C ends at 995,800. B's published supply is `1000999.99999990` because 10 smallest units of bonus dust are burned. |
| `scripts/demo-testnet.sh` | Print the Testnet plan. | Exits 0. Sends nothing. Refuses mainnet. |
| `PAPERHANDS_CONTRACT_ID=diabloodevs.testnet scripts/verify-views.sh` | Read `ft_metadata`, `ft_total_supply`, `get_economic_config`, faucet status. | Demo: symbol `PAPER`, initial supply `100000000000000`, epoch duration `3600000000000` (1 hour), `sybil_resistant: false`. Live supply moves when the contract mints and burns. On 14 Nov 2026 it was `99446499999984`. |

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
frontend/                Next.js app
simulator/               Integer scenarios A, B, and C
scripts/                 build, dry-run demo, read-only views
docs/                    rules, invariants, Sybil limits, deploy notes, visual audit
design-reference/        Phamily Pharma files kept for analysis, not used by the app
```

Pages: `/`, `/how-it-works`, `/commitment`, `/paperhands-index`, `/epoch/[id]`, `/economy`, `/explorer`, `/lab`, `/rules`, `/faq`, plus V3 routes `/sponsors`, `/missions`, `/treasury`, and `/profile/[accountId]`. The lab chart is labeled SIMULATION. It is not Testnet history.

V3 adds SponsorHub, MissionHub, and Treasury beside the deployed Diamond Core. A sponsor campaign locks another 1,000 PAPER. It does not join the Diamond epoch. Demo campaigns last 1 hour. Production campaigns last 7 days. The early-exit 25 PAPER inside SponsorHub is a protocol reserve, not a burn. The demo contracts are `sponsor.diabloodevs.testnet`, `missions.diabloodevs.testnet`, and `treasury.diabloodevs.testnet`. They do not replace the Diamond Core wasm. See [docs/V3_DECISIONS.md](docs/V3_DECISIONS.md), [docs/V3_THREAT_MODEL.md](docs/V3_THREAT_MODEL.md), and [docs/V3_TESTNET_REPORT.md](docs/V3_TESTNET_REPORT.md).

## Live and planned

Implemented and deployed on Testnet, demo clock only:

- Diamond Core at `diabloodevs.testnet` (NEP-141 PAPER plus the commitment methods).
- SponsorHub at `sponsor.diabloodevs.testnet`.
- MissionHub at `missions.diabloodevs.testnet`.
- Treasury at `treasury.diabloodevs.testnet`.

Not implemented as settlement: NEAR Intents, Chain Signatures, and a sentinel that holds a key. `policy/intents.mjs` cannot record a join. `policy/chain-signatures.mjs` cannot sign. `sentinel/sentinel.mjs` only prints a plan and does not broadcast.

The home and economy pages show the live faucet and burn reserves from `get_protocol_balances`. The init split (1,000,000 supply, 700,000 faucet cap, 300,000 burn reserve) is the deployment parameter, not the current balance. On 14 Nov 2026 the live faucet reserve was 671,000 PAPER and the live burn reserve was 294,250 PAPER. Accounting difference was `0`.

One account is not one person. The faucet is not Sybil-proof, and a participant cap is not proof of personhood.

Each of the four accounts still has a Full Access key. That key can replace the wasm. There is no in-contract upgrade method, and the keys were not removed. Do not call this production-ready or permanently immutable.

## Status of this build

Re-read on 14 Nov 2026, no write to the chain. Epoch 82 was in commitment. Epoch 23 is the finalized success: 25 accounts joined, one exited early, finalize minted 240 PAPER, retention 96%. `next_epoch_to_finalize` is 24, so later empty epochs have not been finalized. The Core code hash is `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`. This run did not build a new release wasm, so it does not repeat a byte-for-byte match against that hash.

The full-access key on the contract account is still there, so the wasm can still be replaced.

Reports from this audit: [docs/FULL_SYSTEM_AUDIT.md](docs/FULL_SYSTEM_AUDIT.md), [docs/CONTRACT_SECURITY_AUDIT.md](docs/CONTRACT_SECURITY_AUDIT.md), [docs/FRONTEND_CONTRACT_INTEGRATION.md](docs/FRONTEND_CONTRACT_INTEGRATION.md), [docs/NEAR_STANDARDS_COMPLIANCE.md](docs/NEAR_STANDARDS_COMPLIANCE.md), [docs/TEST_EXECUTION_REPORT.md](docs/TEST_EXECUTION_REPORT.md), [docs/MOCK_CLEANUP_REPORT.md](docs/MOCK_CLEANUP_REPORT.md), [docs/REMAINING_RISKS.md](docs/REMAINING_RISKS.md).

Earlier reports: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), [docs/TEST_REPORT.md](docs/TEST_REPORT.md), [docs/TESTNET_ACCOUNTS.md](docs/TESTNET_ACCOUNTS.md), [docs/TESTNET_E2E_REPORT.md](docs/TESTNET_E2E_REPORT.md), [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md), [docs/SYBIL_LIMITATIONS.md](docs/SYBIL_LIMITATIONS.md).

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

## Deploy the app on Vercel

The Next.js app is `frontend/`, not the repository root.

1. Import this repository in Vercel.
2. Set the Root Directory to `frontend`. Leave the framework as Next.js.
3. Deploy. The build command in `frontend/vercel.json` is `npm run build`. That compiles the local simulator package, then runs `next build`.

The site works with no environment variables. It reads the Testnet accounts in `frontend/lib/config.ts`. Optional overrides are listed in `.env.example`. Keep the network on `testnet`. The app does not connect a mainnet wallet.

## Visual design

The landing page is a cream, forest, and pink editorial layout. The reference audit is [docs/design-audit.md](docs/design-audit.md). Tokens live in [docs/design-system.md](docs/design-system.md) and `frontend/app/globals.css`. What changed, and what was actually checked, is [docs/visual-implementation.md](docs/visual-implementation.md). Phamily artwork stays in `design-reference/` and is not part of the product.
