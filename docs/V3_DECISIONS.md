# PAPERHANDS V3 decisions

These choices close the open items in the V3 specification for this implementation.

- Diamond Core at `diabloodevs.testnet` is unchanged. V3 does not edit `contracts/paperhands` and does not redeploy it. The second faucet claim still panics on that deployment.
- SponsorHub, MissionHub, and Treasury are separate contracts. They accept PAPER only, by the predecessor account id `diabloodevs.testnet`.
- A demo deployment can create only the demo clock: 1 hour and a 10 minute entry. A production deployment can create only the 7 day clock and a 24 hour entry. A sponsor cannot type a duration.
- Thresholds can be stricter than 25 originals and 80% retention, never weaker. The participant cap is at most 200 and counts every account that has joined, including one that cancelled, because the position record stays.
- Sponsor early exit returns 950 PAPER, books 25 to that campaign's survivor bonus, and books 25 to that campaign's protocol reserve. The reserve has no withdraw method. None of that path is a burn.
- Survivor bonus is split on success and on failure. Dust, or the whole pool when nobody stays, moves to the protocol reserve.
- Sponsor reward dust is refundable to the sponsor. Unclaimed sponsor rewards move to that refund 30 days after finalization. Principal does not expire.
- Outgoing PAPER is a pull payment. The liability stays until the transfer callback succeeds. A failed transfer restores the claim, except a sponsor reward that fails after the sweep, which returns to the sponsor.
- Allowing another token needs a proposal from one account and approval from a different account. Even then, this release accepts transfers only from the PAPER contract.
- Missions use one reviewer, a different escalation account, and a challenge window of 10 minutes on demo or 3 days on production. The reviewer cannot refund the budget.
- Treasury donations are separate from principal and sponsor rewards. Two approvers and a timelock are required. Demo timelock is 1 hour. Production timelock is 24 hours. The executor is neither approver.
- NEAR Intents cannot record a join. Chain Signatures cannot sign. The sentinel can name only `activate_campaign`, `finalize_campaign`, and `sweep_expired_rewards`, and this build does not give it a key.
