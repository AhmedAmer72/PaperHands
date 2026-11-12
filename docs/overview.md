# PAPERHANDS overview

PAPERHANDS is one NEAR fungible token and one commitment protocol. The token is NEP-141, NEP-145, and NEP-148. Protocol events are NEP-297.

A participant locks 1,000 PAPER for one epoch. Leaving during the entry window returns all 1,000. Leaving after the entry window and before the epoch ends returns 950, burns 25, and assigns 25 to the survivors of that epoch. After the epoch ends, an early exit is rejected. Anyone can finalize the next ended epoch. Survivors claim their 1,000 principal with no expiry, and an equal mint share plus an equal early-exit bonus, for 30 days after finalization.

Production parameters are fixed at init: a 7 day epoch and a 24 hour entry window, faucet off. The demo init uses the same formulas with a 1 hour epoch, a 10 minute entry window, and a faucet. A demo deployment is not a seven-day production epoch. There is no method that changes these parameters later, and there is no upgrade method.

The demo deployment is the Testnet account `diabloodevs.testnet`: a 1 hour epoch, a 10 minute entry window, and the faucet on. Mainnet has not been deployed. `scripts/demo-testnet.sh` stays a dry run until `PAPERHANDS_EXECUTE=1`.
