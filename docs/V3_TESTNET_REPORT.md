# PAPERHANDS V3 Testnet report

Demo contracts only. Clocks are 1 hour with a 10 minute entry. That is not the 7 day production clock.

Diamond Core stayed at `diabloodevs.testnet`. Its code hash was read again after the V3 deploys, the storage registrations, and the campaign transactions. It is still `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`. V3 did not edit `contracts/paperhands` and did not redeploy that account. The full-access key on Core is still present, so Core is not immutable.

## Why the parent was funded first

`diabloodevs.testnet` had about 2.04 NEAR liquid. The three release wasm files need about 2.91, 2.53, and 2.00 NEAR of code stake. The parent received 4.5 NEAR from each of `paperhandsph00.testnet`, `paperhandsph01.testnet`, and `paperhandsph02.testnet`. Those were NEAR transfers. They did not change the Core wasm. The new contracts are still subaccounts of `diabloodevs.testnet`.

`paperhandsph24.testnet` holds 950 PAPER from the earlier Core epoch, so it cannot lock another 1,000. `v3join.paperhandsph04.testnet` took that seat. Each new account claimed the faucet once. Keys for the new accounts stay in the local NEAR keychain and are not in git.

## Deployments

| Account | Role | Code hash | Deploy | Init |
| --- | --- | --- | --- | --- |
| `sponsor.diabloodevs.testnet` | SponsorHub, `demo-testnet` | `CWkDc2JAS147ka8eKBpD8yVzHbkqp6Y6XHKKej4BW1zK` | [55MXaTkMwVjD1rcYjJLTwVfiFsdkuYUuxZEJpm4SuNAr](https://explorer.testnet.near.org/transactions/55MXaTkMwVjD1rcYjJLTwVfiFsdkuYUuxZEJpm4SuNAr) | [2BtdEdQK87qSEGSmSP1KEPGPx9Gxp7yuCEN6xf1t5HeL](https://explorer.testnet.near.org/transactions/2BtdEdQK87qSEGSmSP1KEPGPx9Gxp7yuCEN6xf1t5HeL) |
| `missions.diabloodevs.testnet` | MissionHub, `demo-testnet` | `5pWeCwWQi7eZijiwRz123wPNMuuBX8qD41H6FLmudMtz` | [VEgYxSNNoYmbcU8QyycKVSPZ2yLyPsbnMH5qfSeLMYV](https://explorer.testnet.near.org/transactions/VEgYxSNNoYmbcU8QyycKVSPZ2yLyPsbnMH5qfSeLMYV) | [27oNvpRxtmhHsf8L8hFRuCnymBnFNeSKoLe2UZ15niuv](https://explorer.testnet.near.org/transactions/27oNvpRxtmhHsf8L8hFRuCnymBnFNeSKoLe2UZ15niuv) |
| `treasury.diabloodevs.testnet` | Treasury, `demo-testnet` | `7bLLeJ7vcQ5LS3nsES9f7TLMPRpDccDnvbKuXoLFpqWy` | [9Zu2jPwDcJiP9BSzRSJqbKfKAz8MfdqSc4nbiT5vhP5g](https://explorer.testnet.near.org/transactions/9Zu2jPwDcJiP9BSzRSJqbKfKAz8MfdqSc4nbiT5vhP5g) | [8jZbHGLoug9cKLtFg1hRLu8VoXLYbpwB9TdaGo5Xr41r](https://explorer.testnet.near.org/transactions/8jZbHGLoug9cKLtFg1hRLu8VoXLYbpwB9TdaGo5Xr41r) |

PAPER storage registration: sponsor [7mtNTFiyLrX3YApfeRrvewr69aKjLtJqDdZtSdgexRTK](https://explorer.testnet.near.org/transactions/7mtNTFiyLrX3YApfeRrvewr69aKjLtJqDdZtSdgexRTK), missions [3Y4BBQmHS4kfRPFKuBYbCr7ARKgCWFebcrnZpMvBwwh9](https://explorer.testnet.near.org/transactions/3Y4BBQmHS4kfRPFKuBYbCr7ARKgCWFebcrnZpMvBwwh9), treasury [H2xNF3ecZDBqqBm5kbdeh9eLhcYWV7gkmwkCWFvT3qNV](https://explorer.testnet.near.org/transactions/H2xNF3ecZDBqqBm5kbdeh9eLhcYWV7gkmwkCWFvT3qNV).

SponsorHub init: PAPER token `diabloodevs.testnet`, pauser `diabloodevs.testnet`, proposer `paperhandsph00.testnet`, approver `paperhandsph01.testnet`. Protocol fee 0. Early exit is not a burn. MissionHub and Treasury use the same PAPER token and the demo clock. Treasury approvers are `paperhandsph02.testnet` and `paperhandsph03.testnet`. The executor is `paperhandsph04.testnet`. The pauser is `diabloodevs.testnet`.

`get_protocol_config` on SponsorHub reports `demo_clock: true`, commitment `100000000000`, minimum 25 originals, 8000 bps retention, cap ceiling 200. Mission list is empty. Treasury accounting difference is `0`. Timelock is 1 hour.

## Success campaign

Campaign 1, sponsor `v3sponsor.paperhandsph03.testnet`, reward pool 1,000 PAPER, minimum 25, retention 80%, cap 30, preset `demo-testnet`.

| Step | Transaction |
| --- | --- |
| Create | [326TNQwiooQosXqwC7V2SoEV17TJTH5T8MFLgrQjudEU](https://explorer.testnet.near.org/transactions/326TNQwiooQosXqwC7V2SoEV17TJTH5T8MFLgrQjudEU) |
| Fund the exact pool | [GKnVgaFzHbKLneVFQJFYwo2Y1wuLQkeuiinU81LuKNhd](https://explorer.testnet.near.org/transactions/GKnVgaFzHbKLneVFQJFYwo2Y1wuLQkeuiinU81LuKNhd) |
| Open entry | [41adr7QZTrNGVnSUKCE4BvwX2Zy6nvsypsWwyNsbRvxq](https://explorer.testnet.near.org/transactions/41adr7QZTrNGVnSUKCE4BvwX2Zy6nvsypsWwyNsbRvxq) |
| Activate | [6r67xdJh2LWmWxZshGKddjMu37ihfAw4WGFQJfCe4Qdi](https://explorer.testnet.near.org/transactions/6r67xdJh2LWmWxZshGKddjMu37ihfAw4WGFQJfCe4Qdi) |
| Early exit, `paperhandsph23.testnet` | [HKfhFFRhbgw9hFGBrpHxgqrCqf2SBdbbnVVK8dNmcfFN](https://explorer.testnet.near.org/transactions/HKfhFFRhbgw9hFGBrpHxgqrCqf2SBdbbnVVK8dNmcfFN) |
| Claim the 950 return | [9dq7pXVd1jNGzWMZyfpCVvdNBZ5E9QRosUYFunC7Yxt9](https://explorer.testnet.near.org/transactions/9dq7pXVd1jNGzWMZyfpCVvdNBZ5E9QRosUYFunC7Yxt9) |
| Finalize success | [2X17JvS4k68vs8V93ooJdYRBunA4SjVr1FnwbnLKiwJ1](https://explorer.testnet.near.org/transactions/2X17JvS4k68vs8V93ooJdYRBunA4SjVr1FnwbnLKiwJ1) |
| Second finalize, rejected | [5nXipXW6iu3SHwwT5ZvsfoU9n9zPjFQ575zrFfhjDFaJ](https://explorer.testnet.near.org/transactions/5nXipXW6iu3SHwwT5ZvsfoU9n9zPjFQ575zrFfhjDFaJ) |
| Sponsor dust refund | [BM27aRMrBWYMB1Ntk9wq3WQRG8EbfG35wd7xodmqeans](https://explorer.testnet.near.org/transactions/BM27aRMrBWYMB1Ntk9wq3WQRG8EbfG35wd7xodmqeans) |

Joins: `paperhandsph00` through `paperhandsph23`, plus `v3join.paperhandsph04.testnet`. That is 25. `paperhandsph24.testnet` did not join.

The finalized view is `FinalizedSuccess`. Originals 25, survivors 24, early exits 1, retention 9600 bps, `early_exit_is_burn: false`. Each survivor's sponsor share is `4166666666` raw and the bonus is `104166666` raw. Dust recorded is 32 raw: 16 from the reward split and 16 from the bonus split. The sponsor dust was refunded.

After every survivor claimed principal, bonus, and sponsor reward, the ledger is assets `2500000016`, protocol reserve `2500000016`, and every other liability `0`. Accounting difference is `0`. Pending transfers are `0`. The reserve stays because this release has no withdraw method. That remainder is 25 PAPER plus 16 raw of bonus dust.

`paperhandsph23.testnet` held 961.04166666 PAPER after the 950 return. That is the 11.04166666 left beside the lock, plus 950.

A second join from `paperhandsph00.testnet`, after it was temporarily holding another 1,000 PAPER, panicked inside SponsorHub with `account already joined or left this campaign`. PAPER refunded that 1,000. The join count stayed 25. Transaction [EfhU26TFDn6igrVKf3cq5NT8iB4HKc8oHZhfUJ3YqhX7](https://explorer.testnet.near.org/transactions/EfhU26TFDn6igrVKf3cq5NT8iB4HKc8oHZhfUJ3YqhX7). The loan was returned before the failure pool was funded.

## Failure campaign

Campaign 2, sponsor `v3fail.paperhandsph05.testnet`, same thresholds, demo clock. Create [FdifEcE39JFnFHtrv9sozHZv5vG7DhA1Meshfo4Pq2NK](https://explorer.testnet.near.org/transactions/FdifEcE39JFnFHtrv9sozHZv5vG7DhA1Meshfo4Pq2NK), fund [4ufbz1CoYph3C4C8gcb7Zmr9XqaRhfxdVXzWxjANkxQu](https://explorer.testnet.near.org/transactions/4ufbz1CoYph3C4C8gcb7Zmr9XqaRhfxdVXzWxjANkxQu), open [BwNqDUH1j3zgweqn31VzKwHLDeRoJQXRDvSnAZKhAsgv](https://explorer.testnet.near.org/transactions/BwNqDUH1j3zgweqn31VzKwHLDeRoJQXRDvSnAZKhAsgv).

Twenty-five accounts joined: `paperhandsph00` through `paperhandsph22`, `v3join.paperhandsph04.testnet`, and `v3joinb.paperhandsph06.testnet`. After the entry window the campaign activated with 25 originals. `paperhandsph17` through `paperhandsph22` exited. Each exit event records 950 returned, 25 to the survivor bonus, 25 to the protocol reserve, and burned `0`. All six claimed the 950. `paperhandsph17.testnet` needed a resend because the first transaction expired before broadcast: [5S1Cam1srh5vdRR7VHLtKm5Ukwe1JDcmnvN9ZYkAoR7M](https://explorer.testnet.near.org/transactions/5S1Cam1srh5vdRR7VHLtKm5Ukwe1JDcmnvN9ZYkAoR7M).

While Active, the ledger was assets 20,300 PAPER, principal 19,000, sponsor reward 1,000, survivor bonus 150, protocol reserve 150, difference `0`.

Finalization [5Wt7botT1QXZhhPnJk2RKwqgKDHWLdK3gybTMa2bZSbb](https://explorer.testnet.near.org/transactions/5Wt7botT1QXZhhPnJk2RKwqgKDHWLdK3gybTMa2bZSbb) produced `FinalizedFailed`. Retention is 7600 bps, below the 8000 bps target, so the sponsor share is 0. The bonus per survivor is `789473684` raw. Dust recorded is 4 raw and it sits in the protocol reserve. The sponsor refund [AKx47dsv3PBhp45djt49U9fz9jetYEWaLfj81k3iNAAu](https://explorer.testnet.near.org/transactions/AKx47dsv3PBhp45djt49U9fz9jetYEWaLfj81k3iNAAu) returned the full 1,000 PAPER pool. `v3fail.paperhandsph05.testnet` holds 1,000 PAPER again.

The 19 survivors then claimed principal and the survivor bonus. The finished ledger is assets `15000000004`, protocol reserve `15000000004`, and every other liability `0`. Difference `0`. Pending transfers `0`. The reserve is 150 PAPER plus 4 raw of bonus dust. There is still no withdraw method for it.

The indexer read both campaigns after this and reported difference `0` for each. Core's code hash is still `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`.

## Local checks already recorded

- `contracts/conviction`: 5 unit tests passed.
- `contracts/sponsorhub`: 20 unit tests passed, and `cargo test --test sandbox` passed `sandbox_failed_transfer_and_successful_cohort`.
- `contracts/missionhub`: 4 unit tests passed.
- `contracts/treasury`: 6 unit tests passed.
- `node --test` on the policy, sentinel, and indexer files: 5 passed.
- The indexer read campaign 1 from Testnet and reported difference `0`. The sentinel printed no permissionless action while the campaign was still inside its hour, and it does not broadcast.
