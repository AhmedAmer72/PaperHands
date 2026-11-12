# Deployment

Nothing in this repository has been deployed. There is no contract account id and no transaction hash to cite. Do not treat a missing hash as a failed transaction. The transaction was not sent.

Mainnet is out of scope. The frontend refuses `NEXT_PUBLIC_NEAR_NETWORK=mainnet`. The scripts refuse a mainnet RPC or a mainnet network name.

Testnet is also not deployed by this build. `scripts/demo-testnet.sh` prints the steps and stops. It sends a transaction only when all of the following are set by the owner:

- `PAPERHANDS_EXECUTE=1`
- `PAPERHANDS_CONTRACT_ID` (an existing Testnet account the signer can deploy to)
- `PAPERHANDS_SIGNER_ID` (the same account, or another account that can sign for it)
- credentials already in the `near-cli-rs` keychain

The script does not create accounts, does not fund them, and does not delete keys. Init arguments for the demo are a 1 hour epoch, a 10 minute entry window, `faucet_enabled: true`, and `deployment_kind: "demo-testnet"`. Production init is a separate explicit command in the script output and is not the demo default.

After a real deploy, `scripts/verify-views.sh` reads `ft_metadata`, `ft_total_supply`, `get_config`, and `get_faucet_status`. It does not write.

Code on an account that still has a full-access key can be replaced. See `docs/security.md`.
