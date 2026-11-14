# Test execution report

Date: 14 Nov 2026. Commands ran in this environment. No private key was used. No 25-account replay was sent to Testnet. No live epoch was finalized. Wallet-signed end-to-end was not run.

## Diamond Core

`cd contracts/paperhands && cargo test --lib --locked --offline`

`test result: ok. 38 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 83.23s`

`cd contracts/paperhands && cargo test --test test_basics --locked -- --test-threads=1`

`test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 606.76s`

The three sandbox tests are `sandbox_empty_epoch_and_demo_clock`, `sandbox_success_cohort_and_dust`, and `sandbox_token_penalty_and_claims`. They deploy a locally built wasm into a local sandbox. They do not touch `diabloodevs.testnet`.

The first attempt failed in 4.69 seconds because `cargo near` was not installed (`error: no such command: near`). Compiling `cargo-near` v0.23.0 from source then failed: the default `c++` is clang and could not find `<algorithm>` when invoked with `--target=x86_64-unknown-linux-gnu`, and `hidapi` could not find `libudev`. The published Linux binary `cargo-near` 0.23.0 was installed and the command was run again. That second run is the pass above. `libudev-dev` was installed on this machine so a later source build can find it. It is not a project dependency.

## SponsorHub, MissionHub, Treasury

Unit tests, `--lib --locked --offline`:

| Crate | Result |
| --- | --- |
| `contracts/sponsorhub` | 20 passed, 0 failed, 1.12s |
| `contracts/missionhub` | 4 passed, 0 failed, 0.26s |
| `contracts/treasury` | 6 passed, 0 failed, 0.38s |

MissionHub and Treasury have no sandbox file. SponsorHub's sandbox file is recorded below. The unit tests do not replace it.

## Simulator, indexer, sentinel, policy

`npm test` in `simulator`:

`Test Files 1 passed (1)`, `Tests 5 passed (5)`, vitest 3.2.7.

`node --test indexer/reconcile.test.mjs sentinel/sentinel.test.mjs policy/chain-signatures.test.mjs policy/intents.test.mjs`

`# tests 5`, `# pass 5`, `# fail 0`.

Those node tests do not open a network connection. The reconcile and sentinel scripts page `list_campaigns` only when executed as programs, not from the unit tests.

## Frontend

From `frontend/`:

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx next lint` | exit 0, three existing `react-hooks/exhaustive-deps` warnings in `missions/[missionId]/page.tsx`, `sponsors/[campaignId]/page.tsx`, and `sponsors/[campaignId]/manage/page.tsx` |
| `npx next build` | exit 0, 17 static pages generated |

The lint warnings were already present. They were not introduced by this audit and were not suppressed.

## Not run

- A signed wallet flow against Testnet.
- Finalizing epochs 24 and later on `diabloodevs.testnet`.
- A fresh 25-account Testnet cohort.
- GitHub Actions. The illustrations branch CI did not start because the GitHub account is locked for billing. See [REMAINING_RISKS.md](REMAINING_RISKS.md).

## SponsorHub sandbox

`cd contracts/sponsorhub && cargo test --test sandbox --locked -- --test-threads=1`

`test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 252.84s`

The test is `sandbox_failed_transfer_and_successful_cohort`. It builds the PAPER and SponsorHub wasm and runs them in a local sandbox. It does not touch the deployed accounts.
