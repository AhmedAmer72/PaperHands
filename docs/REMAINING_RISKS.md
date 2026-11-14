# Remaining risks

Date: 14 Nov 2026. These items are open. They are why the audit is PASS WITH LIMITATIONS and not a production sign-off.

## Upgrade authority

`diabloodevs.testnet`, `sponsor.diabloodevs.testnet`, `missions.diabloodevs.testnet`, and `treasury.diabloodevs.testnet` each have one Full Access key. Whoever holds the matching secret can replace the wasm, rewrite state, or remove the key. This repo does not remove those keys. The contracts have no in-contract upgrade method, and that does not make them immutable while the key exists.

## Demo clock, not a 7-day production deployment

The live Core config is `demo-testnet`: 1 hour epochs, 10 minute entry, faucet on. Production init in source is 7 days / 24 hours with the faucet off. It has not been deployed. Do not describe the Testnet account as the production clock.

## Empty epochs are waiting to be finalized

`next_epoch_to_finalize` is `24`. The current epoch at this read was `82`. Finalizing each empty epoch in order burns 250 PAPER from the burn reserve. This audit did not send those transactions. An operator who "catches up" the chain will spend the reserve under the published rule.

## No historical event index

The app does not scan NEP-297 `ft_mint` and `ft_burn` logs. Cumulative counters on `get_protocol_balances` are the mint and burn history it can show. A missing transaction row is left missing.

NearBlocks' testnet JSON API is not used. Public pages at `testnet.nearblocks.io` are linked. A full explorer history is not reconstructed locally.

## Profile is the current epoch only

`/profile/[accountId]` loads `get_user_epoch_state` for the current epoch, then the sponsor and mission lists. It does not query every past epoch for that account. At epoch 82 that would be about 83 extra view calls per profile.

## Reading every epoch will get expensive

Home and the index call `get_epoch` once per id from 0 through the current id, six at a time. That is 83 calls at epoch 82. The public NEAR RPC returns HTTP 429 under that burst, so testnet reads prefer `https://test.rpc.fastnear.com` when the configured URL is the public one. A deployment that keeps the 1-hour clock for a long time will outgrow this page-load pattern. This pass does not add an indexer.

## Sybil

One account is not one person. `get_faucet_status.sybil_resistant` is false. The faucet pays 1,000 PAPER once per account from the reserve. Many Testnet accounts can claim it. A 25-account cohort run by one operator is not proof of 25 people. Account caps are not proof of personhood.

## SponsorHub controls

The pauser can pause new joins. On the live contract the pauser is `diabloodevs.testnet`, and joins were not paused. The participant cap on SponsorHub is 200, which is stricter than Core's 500. Early-exit's 25 PAPER protocol share is a SponsorHub reserve, not a burn.

## Intents, Chain Signatures, and the sentinel are not live

`policy/intents.mjs` cannot record a join. `policy/chain-signatures.mjs` cannot sign. `sentinel/sentinel.mjs` plans only `activate_campaign`, `finalize_campaign`, and `sweep_expired_rewards`, holds no key, and does not broadcast when `--send` is passed. Its "now" is the machine clock (`Date.now()` converted to nanoseconds), not a contract timestamp. A wrong clock can print a plan that is not yet valid. It still cannot send it.

## Reward sweep is not demonstrated on the successful epoch

Epoch 23's reward deadline is `2026-12-12T00:28:05.695Z`. Unclaimed mint and bonus on that epoch are already 0. There is no expired unclaimed reward to sweep on Testnet right now.

## Wallet-signed end-to-end was not run

This pass mapped every `wallet.send` to a method and deposit and confirmed views in the browser. It did not connect a wallet, claim the faucet, join, exit, finalize, or claim. No private key was added. The 25-account replay was not repeated.

## GitHub Actions billing

CI on the illustrations branch (`cursor/landing-illustrations-aca7`, commit `5352459`) did not start. The job annotation was that the account is locked due to a billing issue. The jobs lasted a few seconds and never received a runner. That is an account limitation, not a test failure in the repo. A new push can hit the same lock. This audit's local test commands are in [TEST_EXECUTION_REPORT.md](TEST_EXECUTION_REPORT.md).

## Rust sandbox depends on `cargo-near`

`cargo test --test test_basics` builds the wasm with `cargo near`. A machine without that binary cannot run the sandbox file. Unit tests do not deploy the wasm and are not a substitute. On 14 Nov 2026, after installing the published `cargo-near` 0.23.0 binary, the three Diamond Core sandbox tests passed. The first attempt failed before that binary was on `PATH`, because compiling `cargo-near` from source needs a C++ toolchain and `libudev`. That failure was the toolchain, not the contract.
