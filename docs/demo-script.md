# Demo script

Deploy and `new` have been sent for `diabloodevs.testnet`. The hashes are in `docs/deployment.md`. The later steps below (faucet, join, exit, finalize, claims) have not been run. Do not invent hashes for those.

The deployment under test is `demo-testnet`: epochs last 1 hour, the entry window lasts 10 minutes, and the faucet is on. Do not describe those epochs as seven-day production epochs.

| Step | Command or action | On-chain result to look for |
| --- | --- | --- |
| Build | `scripts/build-contract.sh` | A wasm under `contracts/paperhands/target/near/`. No chain call. |
| Plan | `scripts/demo-testnet.sh` | Prints the plan and exits. No chain call. |
| Deploy | owner sets `PAPERHANDS_EXECUTE=1` and the account ids, then runs the script | A deploy receipt, then `new` with `deployment_kind = demo-testnet`. |
| Views | `PAPERHANDS_CONTRACT_ID=<id> scripts/verify-views.sh` | Symbol `PAPER`, supply `100000000000000`, epoch duration `3600000000000`, `sybil_resistant: false`. |
| Register and faucet | each account calls `storage_deposit`, then `claim_testnet_faucet` | Balance `100000000000` (1,000 PAPER). A second claim panics with `faucet already claimed`. |
| Join | `join_epoch` during the entry window, with at least 0.1 NEAR attached | 1,000 PAPER moves to the contract. The account's liquid balance drops by 1,000 PAPER. |
| Early exit | after the entry window, before the epoch ends, `exit_early` | Liquid balance increases by 950 PAPER. Supply drops by 25 PAPER. |
| Finalize | after the epoch ends, `finalize_epoch` | Epoch 0 records original, survivors, success or failure, mint, reserve burn, and dust. |
| Claims | survivor calls `claim_epoch_rewards`, then `claim_principal` | Rewards first (mint share plus bonus share). Principal returns 1,000 PAPER and does not expire. |

The faucet is not Sybil-proof. Twenty-five accounts in a demo can be one person. Say that next to any cohort count.

Local proof that does not need a chain:

```bash
cd contracts/paperhands && cargo test --lib --offline
cd contracts/paperhands && cargo test --test test_basics --offline -- --test-threads=1
cd simulator && npm test
```
