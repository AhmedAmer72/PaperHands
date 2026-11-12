# Security audit

Reviewed against the source that matches the deployed code hash `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`. This is a review plus the tests in `docs/TEST_REPORT.md`. It is not a third-party audit.

## Implemented protections

- Amounts are `u128` smallest units. The mint, retention, and bonus splits use checked integer division. There is no floating point in the contract.
- Retention is `survivors * 100 >= original * 80`. An exact 80% passes. 25/32 is 78.125% and fails.
- Graded mint is 1% of surviving locked principal, capped at 500 PAPER, and only `per_survivor * survivors` is minted.
- A failed epoch burns `min(250 PAPER, burn_reserve)` from the burn reserve. It does not take locked principal.
- Early exit of 1,000 PAPER returns 950, burns 25, and books 25 as bonus liability. The bonus is not a second mint.
- If no one stays, the bonus pool is dust and is burned.
- Join, cancel, and exit are once per account per epoch. Cancel blocks rejoin. Exit blocks rejoin.
- Finalize accepts only `next_epoch_to_finalize`, and only after that epoch has ended.
- `claim_principal` requires a survivor and does not expire.
- `claim_epoch_rewards` requires the 30-day window, a survivor, and a single claim. It pays mint and bonus together.
- `sweep_unclaimed_epoch_rewards` waits for that deadline and burns leftover mint and bonus. It does not burn principal.
- State changes call `assert_accounting`. The difference is required to be zero.
- Payable methods require at least 1 yoctoNEAR, so a function-call key cannot move tokens by itself.
- There is no owner withdraw, no pause, and no public setter for the economic config.
- `ft_transfer` is not taxed.

## Tested in this pass

- The nine-row settlement table, the grief cohort above, dust, empty reserve, faucet replay, and the sandbox lifecycle. See `docs/TEST_REPORT.md`.
- On Testnet, a second faucet claim panics. The first 25 claims did not change total supply.

## Known attacks

- Sybil. One person can claim the faucet on many Testnet accounts. The 25 demo accounts are that case. The 1,000 PAPER commitment and the 500 PAPER mint cap raise the cost and cap the emission. They do not prove a unique human.
- Griefing. Seven early exits in a cohort of 32 drop retention to 78.125%. The epoch fails, the streak resets, and 250 PAPER leaves the burn reserve. The 25 survivors still have a 250 PAPER mint and a 175 PAPER bonus pool. The contract does not try to stop this. It pays the survivors what the rules say they earned.
- Upgrade. `diabloodevs.testnet` still has a full-access key. Whoever holds that key can deploy different code. Do not call the contract permanently immutable.
- The key that deployed the contract has been pasted into a chat. It should be rotated by the owner. This pass did not rotate it, because that needs an explicit approval and a replacement key.

## Not found

No method mints outside `new` and the graded emission. No method withdraws another user's locked principal into an owner account. A failed epoch cannot spend the faucet reserve or locked principal.

## Unresolved

- Full-access key remains.
- Reward sweep was not executed on Testnet. The live window is 30 days. Sandbox and the unit test cover it.
- Browser wallet rejection and RPC timeout were not clicked through in this pass.
