# Sybil limitations

The faucet is not Sybil-proof. `get_faucet_status.sybil_resistant` is false. One person can create many Testnet accounts, register each one, and claim 1,000 PAPER on each until the 700,000 PAPER faucet reserve is empty. Claims do not mint. They move the reserve.

A commitment still costs 1,000 PAPER plus the NEAR to store the record. That cost does not stop someone who claimed the faucet on a fresh account. The 25-account minimum and the 500-account cap are counts of contract accounts, not of people.

Nothing in this MVP identifies a person. There is no allowlist, no captcha, and no proof of uniqueness. A demo that shows 25 accounts can be one operator. Treat cohort size as an account count.
