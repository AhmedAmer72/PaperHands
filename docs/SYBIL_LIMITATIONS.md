# Sybil limitations

`get_faucet_status.sybil_resistant` is `false`. The README and the app say the faucet is not Sybil-proof. That statement is accurate.

## What is true

- One NEAR account is not one human.
- One person can create many Testnet accounts. This pass did that: `paperhandsph00.testnet` through `paperhandsph24.testnet` were created by one operator, and each claimed 1,000 PAPER once.
- Those claims moved 25,000 PAPER out of the faucet reserve. Total supply did not change.
- A second claim on the same account panics with `faucet already claimed for this account`.
- The faucet cap is the remaining faucet reserve, 700,000 PAPER at init. It is not a per-person cap.
- Joining still requires 1,000 PAPER and NEAR for the commitment record. An account that just claimed the faucet can pay that 1,000.
- The cohort minimum is 25 accounts, not 25 people.
- Graded mint is 1% of the PAPER that actually stayed, and never more than 500 PAPER in one epoch.
- Those limits make unlimited farming more expensive. They do not stop one person from being the whole cohort.

## What this project does not do

There is no allowlist, captcha, proof of personhood, or identity check. A judge should read a cohort count as an account count.

The 25-account Testnet demo is operated by one party. Say that next to any success or failure result from that demo.
