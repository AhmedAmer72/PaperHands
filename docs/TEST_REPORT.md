# Test report

Run on 11 Nov 2026 from `/workspace`. Nothing in this file was marked passed unless that command finished with zero failures.

## `cargo test --lib --offline`

Result: **38 passed, 0 failed, 0 ignored.** Runtime about 21 seconds.

This includes the nine settlement rows in `retention_table_and_settlement_are_exact`:

| Original | Survivors | Result |
| --- | --- | --- |
| 25 | 25 | success |
| 25 | 20 | success |
| 25 | 19 | failure |
| 32 | 26 | success |
| 32 | 25 | failure |
| 40 | 32 | success |
| 40 | 30 | failure |
| 24 | 24 | failure |
| 0 | 0 | failure |

The same test also checks mint, bonus split, reserve burn, streaks, and the accounting books for each row. An extra row, 25 original / 22 survivors, is success because 88% is above 80%.

`griefing_cohort_still_pays_the_survivors` passed. 32 joined, 7 exited, 25 stayed. Retention is 7,812 bps (78.12%). The epoch fails and the streak resets. Mint is 250 PAPER, reserve burn is 250 PAPER, exit burn is 175 PAPER, and the survivor-bonus bucket is 175 PAPER. Books still close.

Also covered by the passing unit tests: init supply and metadata, both clocks, faucet once and the second-claim panic, faucet cap, untaxed `ft_transfer`, storage registration, join and cancel, no rejoin, early exit 950/25/25, exit too early and too late, duplicate exit, sequential finalize, reward expiry, principal surviving a sweep, dust of 10 units, the 500 PAPER mint cap, and the 500 participant cap.

## `cargo test --test test_basics --offline -- --test-threads=1`

Result: **3 passed, 0 failed, 0 ignored.** Runtime about 597 seconds. This is NEAR sandbox, not Testnet.

- `sandbox_token_penalty_and_claims`
- `sandbox_empty_epoch_and_demo_clock`
- `sandbox_success_cohort_and_dust`

## `npm test` in `simulator`

Result: **5 passed, 0 failed.** Vitest, `src/scenarios.test.ts`.

- Diamond: supply `1,004,000` PAPER, streak 8, four pending days.
- Paperhands: supply `995,800` PAPER, streak 0.
- Balanced: supply `1,000,999.99999990` PAPER because 10 raw units of bonus dust are burned. Streak 0, longest streak 5.

## Not executed here

No test was skipped by a filter except when the grief test was run alone first. The full library suite was then run again and includes it.

Wallet-popup tests were not run. There is no browser harness that drives MyNearWallet.
