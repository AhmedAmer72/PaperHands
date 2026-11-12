# Final completion report

## A. Overall status

DEMO READY.

The commitment loop was executed on NEAR Testnet and the books closed. A judge can connect a Testnet wallet to `diabloodevs.testnet`, claim the faucet, join during the 10-minute entry window, and read the epoch page. The browser wallet popup itself was not clicked in this pass. A failed Testnet epoch and an on-chain reward sweep were not run.

## B. Contract status

- Account: `diabloodevs.testnet`
- Network: Testnet
- Code hash: `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`
- Local wasm matches that hash. It was not redeployed.
- Metadata: PAPERHANDS, PAPER, 8 decimals, `ft-1.0.0`
- Deployment kind: `demo-testnet` (1 hour epoch, 10 minute entry, faucet on)
- Standards in the contract: NEP-141, NEP-145, NEP-148, NEP-297 events
- One full-access key remains. Upgrade is still possible. There is no public economic setter and no owner withdrawal.

## C. Testing status

| Suite | Passed | Failed | Ignored |
| --- | --- | --- | --- |
| `cargo test --lib --offline` | 38 | 0 | 0 |
| `cargo test --test test_basics --offline` | 3 | 0 | 0 |
| `npm test` in `simulator` | 5 | 0 | 0 |

No test was skipped. The new unit test is the 32/25 grief cohort. Sandbox tests are not Testnet transactions.

## D. Economic verification

Testnet epoch 23:

| Item | Result |
| --- | --- |
| Original / survivors / exits | 25 / 24 / 1 |
| Early exit | 950 returned, 25 burned, 25 bonus liability |
| Retention | 96%, success |
| Graded mint | 240 PAPER, 10 PAPER each |
| Reserve burn for this epoch | 0 |
| Empty epochs 0–22 | 250 PAPER each, 5,750 PAPER from the burn reserve |
| Bonus | `104166666` raw per survivor, 16 raw units of dust burned |
| Principal | 1,000 PAPER claimed by each of the 24 survivors |
| Reward claim | mint plus bonus, one transaction, fully claimed |
| Early-exit account | principal claim rejected |
| Accounting difference | `0` |
| Supply after all of the above | `99446499999984` raw |

The failed-epoch numbers (including 25/19 and the grief case of 250 mint, 250 reserve burn, 175 exit burn, 175 bonus) were checked in the unit tests, not on Testnet.

## E. Testnet evidence

Hashes are in [TESTNET_E2E_REPORT.md](TESTNET_E2E_REPORT.md) and [TESTNET_ACCOUNTS.md](TESTNET_ACCOUNTS.md). Deploy and init remain [CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp](https://explorer.testnet.near.org/transactions/CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp) and [AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur](https://explorer.testnet.near.org/transactions/AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur).

## F. Frontend status

All ten routes returned HTTP 200. The economy page rendered the live books, including faucet reserve 675,000 PAPER and accounting difference 0, after the faucet claims. Join, exit, finalize, and claims were executed with the demo keys, not by clicking the wallet popup.

## G. Security status

- The faucet is not Sybil-proof. One operator claimed it 25 times.
- A 32/25 grief cohort fails retention and still pays the survivors. That was a unit test.
- The full-access key can still replace the wasm.
- The deploy key was exposed in chat earlier. It was not rotated.
- Sweep of expired rewards was not shown on Testnet.

## H. Remaining tasks

- Owner approval before any push of this branch.
- A browser wallet click-through, including a rejected signature.
- A second Testnet epoch that fails retention, if a judge wants that hash. The unit tests already cover the failure table.
- An on-chain sweep, which needs a finalized epoch whose 30-day reward window has closed and whose rewards were not fully claimed.
- Rotation or removal of the full-access key, only with explicit owner approval.

## I. Verdict

DEMO READY.

Not HACKATHON SUBMISSION READY: the wallet popup was not exercised, the failed epoch was not repeated on Testnet, and the sweep was not sent on Testnet. The successful commitment, the 950/25/25 exit, the 240 PAPER mint, the claims, and a zero accounting difference are real Testnet results.
