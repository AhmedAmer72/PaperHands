# Tokenomics

Decimals are 8. One PAPER is 100,000,000 smallest units.

| Item | Value |
| --- | --- |
| Name / symbol | PAPERHANDS / PAPER |
| Initial supply | 1,000,000 PAPER |
| Faucet reserve | 700,000 PAPER, already in the initial supply |
| Burn reserve | 300,000 PAPER, already in the initial supply |
| Builder allocation | none |
| Commitment | 1,000 PAPER |
| Early exit | 950 returned, 25 burned, 25 survivor bonus |
| Retention | original at least 25, and survivors × 100 ≥ original × 80 |
| Graded mint | 1% of active locked principal, capped at 500 PAPER per epoch |
| Failed epoch | burn 250 PAPER from the burn reserve when retention fails |
| Reward claim | 30 days after that epoch's finalization |
| Principal claim | no expiry |
| Theoretical mint | 500 × 52 = 26,000 PAPER in a year of full epochs |

The 26,000 figure is the cap if every epoch minted the maximum. It is not an APY and not a promised yield. The UI says the same thing.

Faucet claims move existing supply. They do not mint. One account can claim 1,000 PAPER once. The faucet is not Sybil-proof: one person can use many Testnet accounts.

Ordinary `ft_transfer` is not taxed. Transfers to the contract account are rejected so a donation cannot break the books.

Supply changes only when the protocol mints a graded reward, burns the failed-epoch reserve, burns an early-exit penalty, burns unassigned bonus dust, or burns swept unclaimed rewards. `storage_unregister` with `force = true` can also burn a liquid balance. That burn is outside the protocol buckets. The accounting check still has to close after it.
