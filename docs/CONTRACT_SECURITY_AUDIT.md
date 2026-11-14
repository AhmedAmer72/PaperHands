# Contract security audit

Date: 14 Nov 2026. Source reviewed in `contracts/paperhands`, `contracts/sponsorhub`, `contracts/missionhub`, and `contracts/treasury`. The deployed Diamond Core wasm was not replaced. No finding below was "fixed" by editing Core storage, economics, or public methods. A wasm change would stop matching `diabloodevs.testnet`.

No Critical defect in reachable code was left undocumented. The highest operational fact is upgrade authority: each of the four accounts still has one Full Access key, so the account that holds that key can replace the wasm. That is not a logic bug in the methods. Removing the keys is out of scope and was not done.

## Diamond Core

Economics are copied in `build_config` at init. `contracts/paperhands/src/config.rs` states that nothing writes that struct again. There is no `set_config`, owner setter, or arbitrary mint/burn method. The sandbox file calls `set_config` and expects a failure. Production init rejects a faucet and rejects any clock other than 7 days / 24 hours. Demo init rejects a clock other than 1 hour / 10 minutes.

Public actions: `join_epoch`, `cancel_during_entry`, `exit_early`, `finalize_epoch`, `claim_principal`, `claim_epoch_rewards`, `sweep_unclaimed_epoch_rewards`, `claim_testnet_faucet`, plus NEP-141 `ft_transfer` and `ft_transfer_call`. `claim_survivor_bonus` is not a separate Core method. The bonus is paid inside `claim_epoch_rewards`.

`ft_transfer` and `ft_transfer_call` are payable, reject the contract as receiver, and then call `assert_accounting`. `ft_resolve_transfer` is `#[private]`. Accounting requires the contract's own PAPER balance to equal burn reserve + faucet reserve + locked principal + unclaimed mint + unclaimed exit bonuses. The live difference is `0`.

`overflow-checks = true` in both the dev and release profiles of all four crates.

Token amounts in the contract are `u128`. The frontend keeps those values as decimal strings and `BigInt`. `Number()` is used for epoch ids, participant caps, and retention basis points, which fit in a JavaScript integer, and for converting nanoseconds to milliseconds for display.

## What a Full Access key means

The key can deploy new code, change state, and add or remove keys. Views of the current wasm do not prove that the next wasm will be this source. Do not describe the deployment as trustlessly immutable. There is no upgrade method inside the contract. The upgrade path is the account key, which is still present on all four accounts.

## SponsorHub, MissionHub, Treasury

SponsorHub can pause new joins. Only `pauser` (`diabloodevs.testnet` on the live contract) can call `pause_new_joins` and `resume_new_joins`, and both require 1 yoctoNEAR. A pause blocks joins. It does not block principal claims. The live config had `joins_paused: false`.

The token allowlist needs a proposer and a different approver. PAPER cannot be removed from the allowlist. This release still only accepts PAPER from `diabloodevs.testnet`. An allowlist update does not by itself make a second token settle inside SponsorHub.

Sponsor early exit is 950 back, 25 survivor bonus, and 25 protocol reserve. `early_exit_burned` is false. That 25 is not a Diamond Core burn.

MissionHub pays from escrow. The reviewer cannot refund the pool. Treasury execution requires two distinct approvers, a timelock (1 hour on the demo deployment), and an executor who is not an approver. Live treasury assets are 0 and there are no proposals. Live missions list is empty.

Callbacks `on_transfer_complete` on these contracts are `#[private]`.

## Operational hazard, not a code change

`next_epoch_to_finalize` is `24` while the current epoch is `82`. Epochs 24 through 81 have ended with nobody in them. `finalize_epoch` on an empty epoch burns 250 PAPER from the burn reserve and must run in order. Sending those finalizations would burn about 14,500 PAPER from the reserve before epoch 82 could be finalized. This audit did not send them. An operator should treat that burn as the published rule before catching the chain up.

The reward claim deadline on epoch 23 is `2026-12-12T00:28:05.695Z`. Unclaimed mint and bonus on that epoch are already 0, so a sweep today would not demonstrate a 30-day expiry. Principal does not expire.

## Not implemented, so not a settlement risk

Intents quotes cannot create a join. Chain Signatures evaluation cannot sign. The sentinel process holds no key. A backend in this repo does not decide retention or success. Those outcomes come from the contract views.
