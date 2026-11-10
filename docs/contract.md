# Contract

One contract, `contracts/paperhands`. Init is `new`. There is no upgrade method and no setter for economic parameters.

`new` accepts only these pairs:

| `deployment_kind` | Epoch | Entry window | Faucet |
| --- | --- | --- | --- |
| `production` | 7 days | 24 hours | false |
| `demo-testnet` | 1 hour | 10 minutes | true |

Any other combination panics. The demo clock is not a production clock.

## State-changing methods

`join_epoch`, `cancel_during_entry`, `exit_early`, `finalize_epoch`, `claim_principal`, `claim_epoch_rewards`, `sweep_unclaimed_epoch_rewards`, `claim_testnet_faucet`.

User methods take at least one yoctoNEAR. Join, cancel, exit, faucet, and the first storage growth also take enough NEAR to pay for the bytes. The contract refunds the unused deposit. `ft_transfer`, `ft_transfer_call`, `storage_withdraw`, and `storage_unregister` keep the standard one-yocto check. `ft_resolve_transfer` is private and does not take a deposit.

## Measured storage

Charged inside the call, after the commitment map is flushed:

| Record | Bytes | Cost at 10^19 yoctoNEAR per byte |
| --- | --- | --- |
| First join (epoch record plus commitment) | 274 | 0.00274 NEAR |
| Each later commitment | 67 | 0.00067 NEAR |

The commitment record stays after cancel and after claims. The storage stake is not refunded. The confirm dialog tells the user this before the wallet opens.

## Settlement

Finalization is O(1). It does not walk accounts. The cohort size is snapshotted on the first mutating call after the entry window. Retention uses integer cross-multiplication. Emission is separate: an epoch can fail retention and still mint when at least 25 accounts entered and at least one stayed. Unassigned mint remainder is not minted. Bonus dust is burned. An empty epoch fails, burns 250 PAPER from the reserve until that reserve is empty, and resets the streak.

## Views

`ft_metadata`, `ft_total_supply`, `ft_balance_of`, `get_config`, `get_current_epoch`, `get_epoch`, `get_user_epoch_state`, `get_protocol_balances`, `get_faucet_status`, `get_current_streak`, `get_longest_streak`. Amounts and timestamps are decimal strings. `accounting_difference` is `"0"` when the books close. `get_faucet_status.sybil_resistant` is always false.
