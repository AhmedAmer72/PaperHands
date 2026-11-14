# Full system audit

Date: 14 Nov 2026. Branch `cursor/full-system-audit-aca7`. Read-only against Testnet. No contract was deployed, initialized, or called with a signer. No Mainnet call was made. No live epoch was finalized.

Verdict: **PASS WITH LIMITATIONS**.

Diamond Core views match the documented `demo-testnet` economics. The contract's own accounting difference is `0`. The home and economy cards show the live faucet and burn reserves, not the init split of 700,000 and 300,000. Tests that ran in this environment passed. Items that could not be closed here are named in [REMAINING_RISKS.md](REMAINING_RISKS.md).

## What is live

| Account | Role | Code hash | Access keys |
| --- | --- | --- | --- |
| `diabloodevs.testnet` | Diamond Core, NEP-141 PAPER | `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd` | one Full Access key |
| `sponsor.diabloodevs.testnet` | SponsorHub | `CWkDc2JAS147ka8eKBpD8yVzHbkqp6Y6XHKKej4BW1zK` | one Full Access key |
| `missions.diabloodevs.testnet` | MissionHub | `5pWeCwWQi7eZijiwRz123wPNMuuBX8qD41H6FLmudMtz` | one Full Access key |
| `treasury.diabloodevs.testnet` | Treasury | `7bLLeJ7vcQ5LS3nsES9f7TLMPRpDccDnvbKuXoLFpqWy` | one Full Access key |

Reads used `https://test.rpc.fastnear.com` at finality `final`. The public `https://rpc.testnet.near.org` endpoint returns HTTP 429 when many `get_epoch` calls are sent together, so the app prefers fastnear for testnet reads and falls back to the public URL.

The Core code hash is the same string recorded by the previous audit. This run did not build a release wasm and did not compare a new binary to that hash. Source in `contracts/paperhands` was not edited.

## Diamond Core views

`ft_metadata`: spec `ft-1.0.0`, name PAPERHANDS, symbol PAPER, decimals 8, icon and reference null.

`get_economic_config` is the demo clock, not production:

- `deployment_kind` `demo-testnet`
- epoch `3600000000000` ns (1 hour), entry `600000000000` ns (10 minutes)
- commitment `100000000000` (1,000 PAPER), initial supply `100000000000000` (1,000,000 PAPER)
- faucet enabled, amount 1,000 PAPER, cap `70000000000000`
- minimum 25 participants, maximum 500, retention 80/100
- early-exit penalty 500 bps, split 5000/5000
- mint rate 100 bps, max mint `50000000000` (500 PAPER)
- failed-epoch reserve burn `25000000000` (250 PAPER)
- reward window `2592000000000000` ns (30 days)
- `principal_claim_expires` false

`get_current_epoch` at the time of the read: epoch id `82`, phase `commitment`, `next_epoch_to_finalize` `24`, current streak 1, longest streak 1.

`get_protocol_balances`:

| Field | Raw | PAPER |
| --- | --- | --- |
| total_supply | `99446499999984` | 994464.99999984 |
| faucet_reserve | `67100000000000` | 671000.00000000 |
| burn_reserve | `29425000000000` | 294250.00000000 |
| contract_token_balance | `96525000000000` | 965250.00000000 |
| locked_principal | 0 | 0 |
| unclaimed_mint_rewards | 0 | 0 |
| unclaimed_exit_bonuses | 0 | 0 |
| accounting_difference | `0` | 0 |
| total_graded_minted | `24000000000` | 240 |
| total_exit_burned | `2500000000` | 25 |
| total_reserve_burned | `575000000000` | 5750 |
| total_dust_burned | `16` | 0.00000016 |
| total_swept_burned | `0` | 0 |

Bucket check: burn reserve + faucet reserve + locked principal + unclaimed mint + unclaimed bonuses = `96525000000000`, which equals `contract_token_balance`. Difference is 0.

Supply check: initial supply + graded mint − exit burn − reserve burn − dust burn − swept burn = `99446499999984`, which equals `ft_total_supply`.

`get_faucet_status.sybil_resistant` is false. Remaining faucet equals the live faucet reserve. 29,000 PAPER has left the 700,000 cap (29 claims of 1,000). The burn reserve is 5,750 PAPER below its 300,000 init amount, and `total_reserve_burned` is exactly 5,750 PAPER.

Epochs 0 through 23 are the finalized set (`next_epoch_to_finalize` is 24). Epoch 23 is the successful cohort: retention 96% (25 original, 24 active, 1 early exit), mint 240 PAPER. The other 23 finalized epochs account for the 5,750 PAPER reserve burn at 250 PAPER each. Epochs 24 through 82 were still open at this read. This audit did not finalize them. Finalizing an empty epoch burns 250 PAPER from the reserve.

## V3 views

SponsorHub `get_protocol_config`: PAPER token is `diabloodevs.testnet`, `demo_clock` true, commitment 1,000 PAPER, minimum originals 25, minimum retention 8000 bps, max participant cap 200 (stricter than Core's 500), protocol fee 0, joins not paused, pauser `diabloodevs.testnet`, token proposer `paperhandsph00.testnet`, token approver `paperhandsph01.testnet`, `early_exit_burned` false, `next_campaign_id` `3`. `list_campaigns` returned campaigns 1 and 2.

MissionHub has no `get_protocol_config`. `list_missions` from index 1 returned an empty page. Treasury `get_accounting` difference is `0`, assets `0`, demo clock on, timelock `3600000000000` ns, not paused. `list_proposals` returned an empty page.

## What changed in the app

- Home and economy cards read `initial_supply`, `faucet_reserve`, and `burn_reserve`. A failed read stays an em dash. There is no numeric fallback.
- Home and the index load `get_epoch` for ids `0` through the current id. A failed or in-flight read is not labeled as an empty history.
- The explorer keeps local receipts and an RPC hash lookup, and links to the public NearBlocks page. It does not call the NearBlocks JSON API.
- Sponsor, mission, and treasury lists, plus `indexer/reconcile.mjs` and `sentinel/sentinel.mjs`, page `list_*` past a single 50-row window (up to 40 pages, cursor is the last id plus one).
- Commitment failure rule and mint cap come from `get_economic_config`.
- Epoch timestamps render as ISO when the nanosecond value is a real time. With the wallet disconnected, status reads `wallet off`.
- Create-sponsor reward, mission payout, mission cap, treasury donation, and treasury proposal amount start empty. Contract floors (25 originals, 80% retention) stay.

A browser pass on `http://127.0.0.1:3000` showed epoch 82 in commitment, faucet `671000.00000000 PAPER`, burn `294250.00000000 PAPER`, supply `994464.99999984 PAPER`, accounting difference 0, epoch 23 finalized success at 96% with deadline `2026-12-12T00:28:05.695Z`, and no invented explorer rows.

## What this audit did not treat as a product

NEAR Intents (`policy/intents.mjs`) and Chain Signatures (`policy/chain-signatures.mjs`) are policy modules. They do not settle a join or sign. The sponsors page leaves quotes disabled. `sentinel/sentinel.mjs` only plans `activate_campaign`, `finalize_campaign`, and `sweep_expired_rewards`. `--send` prints that it does not broadcast.

The lab page stays labeled simulation. Rules, FAQ, and how-it-works stay the published protocol text, including the 1,000,000 / 700,000 / 300,000 init split. Those pages are not the live reserve cards.
