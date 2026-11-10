# PAPERHANDS

A NEAR fungible token and a single commitment protocol. Lock 1,000 PAPER for one epoch. Stay, and you can claim that principal plus an equal share of the epoch's mint and of the early-exit bonuses. Leave after the entry window and you get 950 back: 25 is burned and 25 is assigned to whoever stays.

This repository is the Testnet MVP. It has not been deployed. There is no contract account and no transaction hash. The faucet is not Sybil-proof: one person can use many Testnet accounts.

Demo init and production init are different clocks. A `demo-testnet` deployment uses a **1 hour** epoch and a **10 minute** entry window. That is not a 7 day production epoch. Production init is 7 days and 24 hours, with the faucet off. Nothing in the contract changes those parameters after init.

## Judge path

What you can run in this repo today, and what you would see on a chain after the owner deploys. No step below has been sent to Testnet by this build.

| Command | Action | Result |
| --- | --- | --- |
| `cd contracts/paperhands && cargo test --lib --offline` | Run the settlement, penalty, dust, claim, and accounting tests. | 37 unit tests pass. No chain call. |
| `cd contracts/paperhands && cargo test --test test_basics --offline -- --test-threads=1` | Run the sandbox: 950/25/25, a 25-account success, an empty epoch, and a 1-unit dust split. | 3 sandbox tests pass. Local sandbox only. |
| `cd simulator && npm test` | Run scenarios A, B, and C. | A ends at 1,004,000 PAPER. C ends at 995,800. B's published supply is `1000999.99999990` because 10 smallest units of bonus dust are burned. |
| `scripts/demo-testnet.sh` | Print the Testnet plan. | Exits 0. Sends nothing. Refuses mainnet. |
| After the owner deploys: `PAPERHANDS_CONTRACT_ID=<account> scripts/verify-views.sh` | Read `ft_metadata`, supply, config, faucet status. | Demo: symbol `PAPER`, supply `100000000000000`, epoch duration `3600000000000` (1 hour), `sybil_resistant: false`. |

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

Pages: `/`, `/how-it-works`, `/commitment`, `/paperhands-index`, `/epoch/[id]`, `/economy`, `/explorer`, `/lab`, `/rules`, `/faq`. The lab chart is labeled SIMULATION. It is not Testnet history.

## Status of this build

Passed locally: `cargo test --lib` (37), `cargo test --test test_basics` (3), `npm test` in `simulator` (5), `npm run build` in `frontend`.

Not done: Testnet deploy, funded accounts, a live 25-account demo, removal of the contract account's access keys. The contract has no upgrade method, but the account can still deploy new code until those keys are removed. Do not call this production-ready.

Pins: `near-sdk` `=5.30.1` and `near-contract-standards` `=5.30.1`. See [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).

License: MIT OR Apache-2.0. See [LICENSE](LICENSE).

## Visual design

The landing page is a cream, forest, and pink editorial layout. The reference audit is [docs/design-audit.md](docs/design-audit.md). Tokens live in [docs/design-system.md](docs/design-system.md) and `frontend/app/globals.css`. What changed, and what was actually checked, is [docs/visual-implementation.md](docs/visual-implementation.md). Phamily artwork stays in `design-reference/` and is not part of the product.
