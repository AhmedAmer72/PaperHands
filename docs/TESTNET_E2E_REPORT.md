# Testnet end-to-end report

Network: NEAR Testnet. Contract: `diabloodevs.testnet`. Every hash below was returned by `near-cli` with `--wait-until final` and matches a following contract view. Sandbox results are labeled sandbox. Nothing in the "still waiting" section has a hash yet.

## Faucet

Storage registration and one faucet claim per account are in [TESTNET_ACCOUNTS.md](TESTNET_ACCOUNTS.md). Total supply stayed `100000000000000`. Faucet reserve fell to `67500000000000`.

Second claim, rejected:

- Caller: `paperhandsph00.testnet`
- Method: `claim_testnet_faucet`
- Transaction: [CN5teQ5uPFf7WNdnhHXbzYkiBAYGiyX8TfW9G6qb5AHi](https://explorer.testnet.near.org/transactions/CN5teQ5uPFf7WNdnhHXbzYkiBAYGiyX8TfW9G6qb5AHi)
- Result: panic `faucet already claimed for this account`

## Epoch 23 joins

Epoch 22 was already past its entry window, so nobody joined it. All 25 accounts joined epoch 23 while `get_current_epoch.phase` was `entry`.

After the 25 joins, `get_epoch(23)` reported `active_participants = 25`, `locked_principal = 2500000000000` (25,000 PAPER), and `accounting_difference = 0`. Supply was still `100000000000000`.

| Account | Step | Status | Transaction |
| --- | --- | --- | --- |
| `paperhandsph00.testnet` | `join_epoch` | ok | [H24xfPJxrkoe5p3HTiH8DxaRhGcWSgjeyax85j9qw3by](https://explorer.testnet.near.org/transactions/H24xfPJxrkoe5p3HTiH8DxaRhGcWSgjeyax85j9qw3by) |
| `paperhandsph01.testnet` | `join_epoch` | ok | [97TtCCiANxWgNbRshSZmyhLw8Wn7e1qz9cEm7T2buuaE](https://explorer.testnet.near.org/transactions/97TtCCiANxWgNbRshSZmyhLw8Wn7e1qz9cEm7T2buuaE) |
| `paperhandsph02.testnet` | `join_epoch` | ok | [8H4UnPkuu7FtjJjUozYF5j6KoFQ7QTwG4yWQ61c2wueE](https://explorer.testnet.near.org/transactions/8H4UnPkuu7FtjJjUozYF5j6KoFQ7QTwG4yWQ61c2wueE) |
| `paperhandsph03.testnet` | `join_epoch` | ok | [xWK6HMCdaZShtNvapi5r3BfGNVTT4duok9mt15vYGk8](https://explorer.testnet.near.org/transactions/xWK6HMCdaZShtNvapi5r3BfGNVTT4duok9mt15vYGk8) |
| `paperhandsph04.testnet` | `join_epoch` | ok | [AoyEVtKAeMxdCejJNdnSgam8Dn9XuMhuwz28AkENXJKx](https://explorer.testnet.near.org/transactions/AoyEVtKAeMxdCejJNdnSgam8Dn9XuMhuwz28AkENXJKx) |
| `paperhandsph05.testnet` | `join_epoch` | ok | [hUPWEFAhujnnetbXrmBwdwX7N5xkviTtjsuZh7kHrT5](https://explorer.testnet.near.org/transactions/hUPWEFAhujnnetbXrmBwdwX7N5xkviTtjsuZh7kHrT5) |
| `paperhandsph06.testnet` | `join_epoch` | ok | [5jmk3UHqWwtZtVXSSgpMvYtKyGVEkw1RX53mvYVc4Zrq](https://explorer.testnet.near.org/transactions/5jmk3UHqWwtZtVXSSgpMvYtKyGVEkw1RX53mvYVc4Zrq) |
| `paperhandsph07.testnet` | `join_epoch` | ok | [7yvQMstJtKdtaKwAvKRHmqhwwtkDzNFFRVGXQ8W1fL7Y](https://explorer.testnet.near.org/transactions/7yvQMstJtKdtaKwAvKRHmqhwwtkDzNFFRVGXQ8W1fL7Y) |
| `paperhandsph08.testnet` | `join_epoch` | ok | [5vSnjYndFCXR6hSXpJaMD23Gn4RnUtg984kGyGPuZjKD](https://explorer.testnet.near.org/transactions/5vSnjYndFCXR6hSXpJaMD23Gn4RnUtg984kGyGPuZjKD) |
| `paperhandsph09.testnet` | `join_epoch` | ok | [799iWUkEjv5hYCDtJz8pnH87szxVxAxt5E7Qvvd5Kw5X](https://explorer.testnet.near.org/transactions/799iWUkEjv5hYCDtJz8pnH87szxVxAxt5E7Qvvd5Kw5X) |
| `paperhandsph10.testnet` | `join_epoch` | ok | [8zN1HzXJf2BqVwDZGiqj5hUEMLKn6MLTefLw66hXrif5](https://explorer.testnet.near.org/transactions/8zN1HzXJf2BqVwDZGiqj5hUEMLKn6MLTefLw66hXrif5) |
| `paperhandsph11.testnet` | `join_epoch` | ok | [9dVsH4H2RjG4mMd685qh5sfm3axDRFSzh7bXLFSk3qg](https://explorer.testnet.near.org/transactions/9dVsH4H2RjG4mMd685qh5sfm3axDRFSzh7bXLFSk3qg) |
| `paperhandsph12.testnet` | `join_epoch` | ok | [DFjoNB4QypDBSwnfimGpG1BWqfYwWbgzSgkMuYat3zN9](https://explorer.testnet.near.org/transactions/DFjoNB4QypDBSwnfimGpG1BWqfYwWbgzSgkMuYat3zN9) |
| `paperhandsph13.testnet` | `join_epoch` | ok | [J7h7dXvWo2tUPSH7ZXBbAPrtsZeYcVX6WiQUSUmZumgW](https://explorer.testnet.near.org/transactions/J7h7dXvWo2tUPSH7ZXBbAPrtsZeYcVX6WiQUSUmZumgW) |
| `paperhandsph14.testnet` | `join_epoch` | ok | [6i9tqFaCf89H6zUDCAvXuMAuHEips59JGCkxiMARNM6H](https://explorer.testnet.near.org/transactions/6i9tqFaCf89H6zUDCAvXuMAuHEips59JGCkxiMARNM6H) |
| `paperhandsph15.testnet` | `join_epoch` | ok | [BeCB37e7hTHXHowkgTwtU2YSbmAG3275Epyt9U2dE9KS](https://explorer.testnet.near.org/transactions/BeCB37e7hTHXHowkgTwtU2YSbmAG3275Epyt9U2dE9KS) |
| `paperhandsph16.testnet` | `join_epoch` | ok | [AspAxn6iaHfKJgX2pF4v9bWEvVUHb2kFmpUbeJkUGPNy](https://explorer.testnet.near.org/transactions/AspAxn6iaHfKJgX2pF4v9bWEvVUHb2kFmpUbeJkUGPNy) |
| `paperhandsph17.testnet` | `join_epoch` | ok | [8ZM4vwbyXjQhb81FyPMV7bWP3nffupCDxsmALWVkHjgq](https://explorer.testnet.near.org/transactions/8ZM4vwbyXjQhb81FyPMV7bWP3nffupCDxsmALWVkHjgq) |
| `paperhandsph18.testnet` | `join_epoch` | ok | [55uajDi78swz9Q3iahSn6xQ8eY2tdigjQJRAQUSPD75z](https://explorer.testnet.near.org/transactions/55uajDi78swz9Q3iahSn6xQ8eY2tdigjQJRAQUSPD75z) |
| `paperhandsph19.testnet` | `join_epoch` | ok | [DZvZN4ZmuwTAwhFLH63gp3QRcq8gD2KaQikByZUvFhk1](https://explorer.testnet.near.org/transactions/DZvZN4ZmuwTAwhFLH63gp3QRcq8gD2KaQikByZUvFhk1) |
| `paperhandsph20.testnet` | `join_epoch` | ok | [8GZYpuyj7wyyGzPwrUxsbfGWYeEUenZiSNAMc6H44JEu](https://explorer.testnet.near.org/transactions/8GZYpuyj7wyyGzPwrUxsbfGWYeEUenZiSNAMc6H44JEu) |
| `paperhandsph21.testnet` | `join_epoch` | ok | [CN14Yyhouaz7SJBeAMVKnXzaNEWVKoWiyuhHuC3RXD6C](https://explorer.testnet.near.org/transactions/CN14Yyhouaz7SJBeAMVKnXzaNEWVKoWiyuhHuC3RXD6C) |
| `paperhandsph22.testnet` | `join_epoch` | ok | [2tZpTicsEdBv5ELAMqBwmuVmk1QAkoyhJX5PdsiG8vfx](https://explorer.testnet.near.org/transactions/2tZpTicsEdBv5ELAMqBwmuVmk1QAkoyhJX5PdsiG8vfx) |
| `paperhandsph23.testnet` | `join_epoch` | ok | [Et2cwZxup5ZBMrZnLwXBkZAkYUgRyCBvNFeVQ4ND9HRm](https://explorer.testnet.near.org/transactions/Et2cwZxup5ZBMrZnLwXBkZAkYUgRyCBvNFeVQ4ND9HRm) |
| `paperhandsph24.testnet` | `join_epoch` | ok | [2LW8RWpR9B5kwi2o5twWBDsycpjx2P1GwUUxieuN2yZD](https://explorer.testnet.near.org/transactions/2LW8RWpR9B5kwi2o5twWBDsycpjx2P1GwUUxieuN2yZD) |

## Early exit

After entry closed, `paperhandsph24.testnet` called `exit_early`.

- Transaction: [4uKYhdoknnAqQ2KNdKrjQrw69kxJpkC8JWuM1PR3WhKz](https://explorer.testnet.near.org/transactions/4uKYhdoknnAqQ2KNdKrjQrw69kxJpkC8JWuM1PR3WhKz)
- That account's PAPER balance: `95000000000` (950 PAPER)
- Epoch 23: original 25, active 24, early exits 1
- Locked principal: `2400000000000` (24,000 PAPER)
- Exit burned: `2500000000` (25 PAPER)
- Survivor bonus pool: `2500000000` (25 PAPER)
- Total supply: `99997500000000` (999,975 PAPER)
- Accounting difference: `0`

## Finalize

`next_epoch_to_finalize` was 0, so epochs 0 through 22 were finalized before epoch 23. Those 23 epochs had no joins. Each burned 250 PAPER from the burn reserve. That is 5,750 PAPER. Locked principal was not used. Epoch 0's view after finalize: `success = false`, `original_participants = 0`, `reserve_burned = 25000000000`.

Epoch 23 finalize, signer `diabloodevs.testnet`, RPC `SuccessValue`:

[DGsX76DrTpy1WRtiFKRYpT8kHcmQHrT5RpKgrF5MJNV4](https://explorer.testnet.near.org/transactions/DGsX76DrTpy1WRtiFKRYpT8kHcmQHrT5RpKgrF5MJNV4)

| Field | On-chain value |
| --- | --- |
| Success | true |
| Original / survivors / exits | 25 / 24 / 1 |
| Retention | 9600 bps (96%) |
| Mint | `24000000000` (240 PAPER) |
| Per survivor mint | `1000000000` (10 PAPER) |
| Per survivor bonus | `104166666` raw (1.04166666 PAPER) |
| Dust burned | 16 raw units |
| Reserve burn for this epoch | 0 |
| Current streak / longest | 1 / 1 |

Empty-epoch finalize hashes, epochs 0 through 22, all RPC-successful, signer `diabloodevs.testnet`:

| Epoch | Transaction |
| --- | --- |
| 0 | [7QKNXWdC5X2Hdm1E7f29CAWooBETGPmrUgf1w83HNRi4](https://explorer.testnet.near.org/transactions/7QKNXWdC5X2Hdm1E7f29CAWooBETGPmrUgf1w83HNRi4) |
| 1 | [Abmx42PTVtsu17VbXj91ZfAE6zR6JxwWkXfvs9fw1R5n](https://explorer.testnet.near.org/transactions/Abmx42PTVtsu17VbXj91ZfAE6zR6JxwWkXfvs9fw1R5n) |
| 2 | [2P1RJscDDV6RGyAoWPBN58p2TxYjgC2CatANiG5zuus8](https://explorer.testnet.near.org/transactions/2P1RJscDDV6RGyAoWPBN58p2TxYjgC2CatANiG5zuus8) |
| 3 | [6Si4fbp9pAMEuhMHzBqDXvPDiBPUUWxcLN42Tc5p9mv2](https://explorer.testnet.near.org/transactions/6Si4fbp9pAMEuhMHzBqDXvPDiBPUUWxcLN42Tc5p9mv2) |
| 4 | [95eLG7YZUtTizDVk6Rt5Xwg4YWC7Pwu2ZxYHJrgxsiNv](https://explorer.testnet.near.org/transactions/95eLG7YZUtTizDVk6Rt5Xwg4YWC7Pwu2ZxYHJrgxsiNv) |
| 5 | [5xqpZuaqJU8D8AGXBd7sWvn6oAn5MiPqs8SC7uMBjhvr](https://explorer.testnet.near.org/transactions/5xqpZuaqJU8D8AGXBd7sWvn6oAn5MiPqs8SC7uMBjhvr) |
| 6 | [WXYbVwPQVx2FSuTeJeoFD3uefAnrzc8iUfe5STFBfa8](https://explorer.testnet.near.org/transactions/WXYbVwPQVx2FSuTeJeoFD3uefAnrzc8iUfe5STFBfa8) |
| 7 | [A8xpwLdVVw7t2G5eeSP9ZLDmXYFQuhJCqwAxZBVy91nV](https://explorer.testnet.near.org/transactions/A8xpwLdVVw7t2G5eeSP9ZLDmXYFQuhJCqwAxZBVy91nV) |
| 8 | [86rAP3skfBMe3bEsdA9KpNkhVM27NEBHkq94f386u2BZ](https://explorer.testnet.near.org/transactions/86rAP3skfBMe3bEsdA9KpNkhVM27NEBHkq94f386u2BZ) |
| 9 | [GcDQn186WunEGLVS4DYGSYPjoe87dHsiZn2TWzdBbEpP](https://explorer.testnet.near.org/transactions/GcDQn186WunEGLVS4DYGSYPjoe87dHsiZn2TWzdBbEpP) |
| 10 | [GJbsQ3DX9AM4kPpJ9d5T6rmLR9g57z9bBALLskZdAifu](https://explorer.testnet.near.org/transactions/GJbsQ3DX9AM4kPpJ9d5T6rmLR9g57z9bBALLskZdAifu) |
| 11 | [HphAjBGsPuh37DuFVm6MKY6vjKcaKcP5cNEpsBTXenRa](https://explorer.testnet.near.org/transactions/HphAjBGsPuh37DuFVm6MKY6vjKcaKcP5cNEpsBTXenRa) |
| 12 | [J9LmZjeED7fdLoR4bMtjn9wtXm44L9WwEWSaFQm5kYEQ](https://explorer.testnet.near.org/transactions/J9LmZjeED7fdLoR4bMtjn9wtXm44L9WwEWSaFQm5kYEQ) |
| 13 | [A8RAkNBxyFXQBWkNpoernj34PyZhvT1zcvSLBujWYG9V](https://explorer.testnet.near.org/transactions/A8RAkNBxyFXQBWkNpoernj34PyZhvT1zcvSLBujWYG9V) |
| 14 | [3R5FjqS8SN6jakKR7XLiz5dpBUQkTarTF1XRWgPBpN5F](https://explorer.testnet.near.org/transactions/3R5FjqS8SN6jakKR7XLiz5dpBUQkTarTF1XRWgPBpN5F) |
| 15 | [2sng7CQLLtagbF3bcNujxpcNHKRfuFVA4i7xKjtj4ciZ](https://explorer.testnet.near.org/transactions/2sng7CQLLtagbF3bcNujxpcNHKRfuFVA4i7xKjtj4ciZ) |
| 16 | [6prdjsZM2ACNqH2p4ZVKDuT47SCt95FQi914zkzZ6NCJ](https://explorer.testnet.near.org/transactions/6prdjsZM2ACNqH2p4ZVKDuT47SCt95FQi914zkzZ6NCJ) |
| 17 | [D9RanNQrdT6mFsBopXCacFcmpmbipdW3eCprovA16jAi](https://explorer.testnet.near.org/transactions/D9RanNQrdT6mFsBopXCacFcmpmbipdW3eCprovA16jAi) |
| 18 | [ZnbaWCM5u47vHD15YSUv2UxjCyycxi9NJDL9pmMo6kj](https://explorer.testnet.near.org/transactions/ZnbaWCM5u47vHD15YSUv2UxjCyycxi9NJDL9pmMo6kj) |
| 19 | [8zyMZgsioiHs4XezJNxBPdVCH64XdmpxUyL6SoinAUJf](https://explorer.testnet.near.org/transactions/8zyMZgsioiHs4XezJNxBPdVCH64XdmpxUyL6SoinAUJf) |
| 20 | [7amBenmSa1ZT9qsXCJnVpMGcc1Esy12Z8JYzB9t4WfxL](https://explorer.testnet.near.org/transactions/7amBenmSa1ZT9qsXCJnVpMGcc1Esy12Z8JYzB9t4WfxL) |
| 21 | [GhPKVPQ41vmDVHzCTLs8Y9Ht3s8y6XEQwBEkAXtsXTY3](https://explorer.testnet.near.org/transactions/GhPKVPQ41vmDVHzCTLs8Y9Ht3s8y6XEQwBEkAXtsXTY3) |
| 22 | [3L9patkT7nWSVJJrqnNwQ3qQbaZqPVpa4WwhSgiyMCTJ](https://explorer.testnet.near.org/transactions/3L9patkT7nWSVJJrqnNwQ3qQbaZqPVpa4WwhSgiyMCTJ) |

## Claims

`paperhandsph00.testnet` through `paperhandsph23.testnet` each claimed principal and rewards. Both of `paperhandsph00.testnet`'s claims returned RPC `SuccessValue`. Its balance is `101104166666` raw: 1,000 principal + 10 mint + `104166666` bonus.

- Principal: [8T1TfmhrNsUa2q2YQ4SPS4yYDW3RvTT12f2xGWjodK6K](https://explorer.testnet.near.org/transactions/8T1TfmhrNsUa2q2YQ4SPS4yYDW3RvTT12f2xGWjodK6K)
- Rewards: [8mGJP75LqP5Ri1iJSVnQjkeutofcr4c2qzWckKkvGCJj](https://explorer.testnet.near.org/transactions/8mGJP75LqP5Ri1iJSVnQjkeutofcr4c2qzWckKkvGCJj)

The other 23 survivor claim hashes were accepted by the RPC and the epoch's unclaimed mint and unclaimed bonus are both `0`. `paperhandsph24.testnet` still holds 950 PAPER. Its principal claim failed, RPC `Failure`, panic `only an unclaimed survivor can claim principal`:

[9PrnQCq9hWreqLB4H99x6WsSGRVprMaG9DgKPZwWx95P](https://explorer.testnet.near.org/transactions/9PrnQCq9hWreqLB4H99x6WsSGRVprMaG9DgKPZwWx95P)

## Books after the claims

| Bucket | Raw |
| --- | --- |
| Total supply | `99446499999984` |
| Burn reserve | `29425000000000` |
| Faucet reserve | `67500000000000` |
| Locked principal | `0` |
| Unclaimed mint | `0` |
| Unclaimed bonus | `0` |
| Accounting difference | `0` |
| Graded minted | `24000000000` |
| Exit burned | `2500000000` |
| Reserve burned | `575000000000` |
| Dust burned | `16` |

Supply check: `1,000,000 PAPER` minus 25 exit burn, minus 5,750 empty-epoch reserve burn, plus 240 mint, minus 16 raw dust units.

## Failed epoch and sweep

A second Testnet epoch with 19 survivors was not run. The 25/19 failure and the 32/25 grief case passed in `cargo test --lib`. That is local contract execution, not a Testnet hash.

`sweep_unclaimed_epoch_rewards` was not sent on Testnet. The live reward window is 30 days, and epoch 23's rewards were fully claimed, so there is nothing left to sweep. The unit test `claims_expire_rewards_only_and_principal_survives_sweep` passed. That is not a Testnet transaction.
