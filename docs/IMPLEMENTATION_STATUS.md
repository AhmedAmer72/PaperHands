# Implementation status

Audited on 11 Nov 2026 against the repository on `cursor/paperhands-visual-craft-6643` and the live Testnet contract. The working tree was clean before this pass. No uncommitted product changes were overwritten.

## Live deployment

| Item | Value |
| --- | --- |
| Account | `diabloodevs.testnet` |
| Network | Testnet |
| Code hash | `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd` |
| Local wasm SHA-256 | `eeec6413abc686473388933a28c82be0003c2685f8408330b1de973632e2cafe` |
| Match | The base58 SHA-256 of the local wasm is the on-chain code hash. The deployed code is this source. |
| Liquid balance | about 4.998 NEAR |
| Access key | one `FullAccess` key. It was not removed. |
| Kind | `demo-testnet` |
| Epoch | 1 hour. Entry window 10 minutes. |
| Supply | `100000000000000` at audit time, then unchanged by the faucet claims |
| Accounting difference | `0` |

At the audit query the clock was epoch 22, phase `commitment`, and `next_epoch_to_finalize` was `0`. Epoch 0 is not open. Nobody had joined, so locked principal was 0.

Empty epochs 0 through 22, if finalized in order with no joins, each burn 250 PAPER from the burn reserve. That is 23 epochs and 5,750 PAPER. The reserve can cover it. Those finalizations were not sent during the audit. They are required later only because `finalize_epoch` is sequential and a later successful epoch cannot be finalized until they are. A second contract was not deployed: the account does not have enough spare NEAR to stake another 290 KB wasm and also fund a 25-account cohort.

## Implemented

- One Rust contract: NEP-141, NEP-145, NEP-148, and NEP-297 events.
- Immutable init. No owner, pause, upgrade, or parameter setter.
- Faucet from the 700,000 reserve. It does not mint.
- Join, entry cancel, early exit (950 / 25 / 25), sequential finalize, streaks.
- `claim_principal` never expires.
- `claim_epoch_rewards` pays the mint share and the survivor bonus together, inside the 30-day window.
- `sweep_unclaimed_epoch_rewards` burns unclaimed mint and bonus only.
- Accounting equality after state changes.
- Simulator scenarios A, B, and C, labeled simulation.
- Frontend routes, confirm-before-sign, and SuccessValue plus RPC confirmation.
- Testnet deploy and init. See `docs/deployment.md`.
- Twenty-five faucet-funded accounts. See `docs/TESTNET_ACCOUNTS.md`.

## Partial

- Epoch 23 is a finished Testnet success: 25 joins, one early exit, finalize, principal claims, and reward claims. Hashes are in `docs/TESTNET_E2E_REPORT.md`. A second, failed Testnet epoch was not run. The failure cases passed in the unit tests.
- The explorer shows this browser's receipts, an RPC hash lookup, and a NearBlocks account slice. It does not index every event type from the contract logs.
- A browser wallet popup was not clicked. Contract calls for the demo accounts were signed with their Testnet keys through `near-cli-rs`.

## Not implemented, on purpose

- `claim_survivor_bonus` as a separate method. The bonus is paid inside `claim_epoch_rewards`. Splitting it would change the deployed API and needs a new wasm. The local wasm already matches the chain, so it was not redeployed.
- Mainnet.
- Removal of the full-access key.
- Production init on this account. The live init is `demo-testnet`.
- Proof of humanity.

## Spec differences that were not "fixed"

- The hackathon brief's balanced scenario prints a final supply of `1,001,000` PAPER. The contract and the simulator burn the 10 smallest units of bonus dust, so the verified supply is `1,000,999.99999990` PAPER. The dust burn stays.
- The brief lists a separate bonus-claim method. The shipped method claims mint and bonus together. The frontend copy says that.

## Tests at this audit

- `cargo test --lib --offline`: 38 passed, 0 failed, 0 ignored.
- `cargo test --test test_basics --offline`: 3 passed, 0 failed.
- `npm test` in `simulator`: 5 passed, 0 failed.

The new unit test is `griefing_cohort_still_pays_the_survivors`. It does not change the contract.

## Risks

- The full-access key can still replace the wasm. The contract is not permanently immutable.
- One operator controls the 25 demo accounts. That is a Sybil demonstration, not a defense.
- Finalizing the empty epochs burns 250 PAPER each from the burn reserve. That is the rule for an empty epoch. It is not a user-principal burn.
- The reward sweep cannot be shown on this deployment inside the hackathon window. The claim window is 30 days. Sweep is covered by the unit test and the sandbox test, not by a Testnet transaction.
