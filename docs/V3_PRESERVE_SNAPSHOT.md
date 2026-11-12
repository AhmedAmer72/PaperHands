# Diamond Core preserve snapshot

Taken before any PAPERHANDS V3 crate was added. V3 does not edit this contract and does not redeploy it.

| Item | Value |
| --- | --- |
| Git commit | `d50e7c3a190a2f726fc92d45461b849a636a226d` |
| Account | `diabloodevs.testnet` |
| Deployment transaction | `CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp` |
| Initialization transaction | `AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur` |
| Deployment kind | `demo-testnet` (1 hour epoch, 10 minute entry, faucet on) |
| Reported code hash | `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd` |
| `Cargo.toml` git hash | `81fb5ccf21bc9e35d6357bb059670a520d174f94` |
| `Cargo.lock` git hash | `e87a8ebc5891455d98b2a780ab51d987498d3bfd` |
| SHA-256 of sorted `src` and `tests` Rust sources | `e74b8820ae3fcb80b3634a161244b5c4db429ac45df8ef563a144b860eee42fb` |

Production rules stay 7 days and a 24 hour entry with the faucet off. The demo clock above is not that configuration.

The full-access key on `diabloodevs.testnet` was still present when this snapshot was written. The account can still replace the wasm. This snapshot does not call the contract immutable.

Known Core limitation left in place: a second faucet claim panics instead of returning a controlled error. Fixing that would change the source and would require a separate release. V3 does not redeploy over this account to fix it.

V3 contracts may call this deployment only as a NEP-141 token (`storage_deposit`, `ft_transfer_call`, `ft_transfer`, `ft_balance_of`). They do not call epoch, faucet, or settlement methods, and they do not read Core reserves as their own balances.
