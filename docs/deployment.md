# Deployment

The demo contract is live on Testnet at `diabloodevs.testnet`. Mainnet has not been deployed.

| Step | Transaction |
| --- | --- |
| Deploy wasm `eeec6413abc686473388933a28c82be0003c2685f8408330b1de973632e2cafe` | [CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp](https://explorer.testnet.near.org/transactions/CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp) |
| `new` with `deployment_kind = demo-testnet` | [AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur](https://explorer.testnet.near.org/transactions/AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur) |

`new` emitted a NEP-141 `ft_mint` of `100000000000000` raw units (1,000,000 PAPER, 8 decimals) to the contract account. Epoch 0 opened in the entry phase. `get_protocol_balances.accounting_difference` is `0`. The full-access key on the account was not removed.

Mainnet is out of scope. The frontend refuses `NEXT_PUBLIC_NEAR_NETWORK=mainnet`. The scripts refuse a mainnet RPC or a mainnet network name.

`scripts/demo-testnet.sh` prints the steps and stops. It sends a transaction only when all of the following are set by the owner:

- `PAPERHANDS_EXECUTE=1`
- `PAPERHANDS_CONTRACT_ID` (an existing Testnet account the signer can deploy to)
- `PAPERHANDS_SIGNER_ID` (the same account, or another account that can sign for it)
- credentials already in the `near-cli-rs` keychain

The script does not create accounts, does not fund them, and does not delete keys. Init arguments for the demo are a 1 hour epoch, a 10 minute entry window, `faucet_enabled: true`, and `deployment_kind: "demo-testnet"`. Production init is a separate explicit command in the script output and is not the demo default.

`scripts/verify-views.sh` reads `ft_metadata`, `ft_total_supply`, `get_economic_config`, and `get_faucet_status`. It does not write. The frontend defaults `NEXT_PUBLIC_CONTRACT_ID` to `diabloodevs.testnet`.

Code on an account that still has a full-access key can be replaced. See `docs/security.md`.
