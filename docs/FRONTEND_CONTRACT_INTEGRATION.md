# Frontend contract integration

Date: 14 Nov 2026. Wallet calls go through `@hot-labs/near-connect` on testnet. `frontend/lib/wallet.tsx` treats a call as success only when the wallet outcome contains `SuccessValue` and not `Failure`, and `confirmTransaction` then reads that hash from RPC. A hash alone is not success. Mainnet is refused when `NEXT_PUBLIC_NEAR_NETWORK` is `mainnet`.

Gas on every function call is `200000000000000` (200 TGas). Attached deposits below are what the app sends. The contract refunds unused NEAR. Token amounts that cross the wire are decimal strings.

Reads use `frontend/lib/chain.ts`. On testnet, when the configured RPC is exactly `https://rpc.testnet.near.org`, reads start at `https://test.rpc.fastnear.com` and fall back to the public URL. `viewEpochs` loads `get_epoch` in batches of six from id 0 through the current id.

This pass did not sign a wallet transaction. The "Verified" column is a source trace plus the read-only views and the browser pass. It is not a signed end-to-end receipt.

## Diamond Core

Default account `diabloodevs.testnet`.

| Action | Method | Attached deposit | Expected state change | Verified |
| --- | --- | --- | --- | --- |
| Register storage | `storage_deposit` `{account_id: null, registration_only: null}` | `50000000000000000000000` (0.05 NEAR) | Account can hold PAPER | Mapped in `commitment/page.tsx`. Not signed. |
| Claim faucet | `claim_testnet_faucet` `{}` | 0.05 NEAR | One 1,000 PAPER claim from the faucet reserve. Second claim fails. | Mapped. Live `get_faucet_status` shows the reserve and `sybil_resistant: false`. Not signed. |
| Join | `join_epoch` `{}` | `100000000000000000000000` (0.1 NEAR) | 1,000 PAPER locks during entry | Mapped. Not signed. |
| Cancel during entry | `cancel_during_entry` `{}` | 0.1 NEAR | Full principal returns, no penalty | Mapped. Not signed. |
| Exit early | `exit_early` `{}` | 0.1 NEAR | 950 returns, 25 burns, 25 is assigned to survivors | Mapped. Not signed. |
| Finalize | `finalize_epoch` `{epoch_id}` | 0.1 NEAR | Next ended epoch settles in order | Mapped on `/epoch/[id]`. Not sent. Empty epochs 24–81 were left open. |
| Claim principal | `claim_principal` `{epoch_id}` | 0.1 NEAR | 1,000 PAPER returns. Principal does not expire. | Mapped. Not signed. |
| Claim rewards | `claim_epoch_rewards` `{epoch_id}` | 0.1 NEAR | Equal mint share plus equal bonus | Mapped. Not signed. |
| Sweep rewards | `sweep_unclaimed_epoch_rewards` `{epoch_id}` | 0.1 NEAR | After the 30-day window, unclaimed mint and bonus burn. Principal stays. | Mapped. Epoch 23's deadline is still in the future and its unclaimed rewards are already 0. |

Views used by the pages: `get_current_epoch`, `get_epoch`, `get_economic_config`, `get_protocol_balances`, `get_user_epoch_state`, `ft_balance_of`. Streak and phase on the home hero come from `get_current_epoch` and `get_epoch`. Projected retention is labeled provisional and is empty until entry has closed (`projected_success` is null during commitment).

`/profile/[accountId]` reads `get_user_epoch_state` for the current epoch only. It does not walk every past epoch. That limit is recorded in [REMAINING_RISKS.md](REMAINING_RISKS.md).

## SponsorHub

Default account `sponsor.diabloodevs.testnet`. A sponsor lock is a second 1,000 PAPER. It does not join the Diamond epoch.

| Action | Method | Deposit | Receiver | Expected state |
| --- | --- | --- | --- | --- |
| Create campaign | `create_campaign` | 1 yoctoNEAR | SponsorHub | Draft campaign. Reward field starts empty. Floors stay 25 originals and 80% retention. |
| Fund reward | `ft_transfer_call` msg `{"action":"fund_reward","campaign_id":n}` | 1 yoctoNEAR | PAPER contract | Full reward moves into the campaign |
| Open / cancel / refund | `open_campaign`, `cancel_campaign`, `refund_sponsor` | 1 yoctoNEAR | SponsorHub | Sponsor-controlled lifecycle |
| Join | `ft_transfer_call` msg `{"action":"join","campaign_id":n}` amount = campaign commitment | 1 yoctoNEAR | PAPER contract | Principal locks in SponsorHub |
| Cancel join / exit / activate / finalize | `cancel_join`, `exit_early`, `activate_campaign`, `finalize_campaign` | 1 yoctoNEAR | SponsorHub | Exit returns 950. The 25 protocol share is a reserve, not a burn. |
| Claims | `claim_principal`, `claim_survivor_bonus`, `claim_sponsor_reward` | 1 yoctoNEAR | SponsorHub | Paid from that campaign's books |

`list_campaigns` pages from id 1, 50 at a time, up to 40 pages. Live list length is 2.

Quotes stay disabled. `policy/intents.mjs` throws if something tries to record a join from a quote.

## MissionHub

Default account `missions.diabloodevs.testnet`.

| Action | Method | Deposit | Receiver |
| --- | --- | --- | --- |
| Create draft | `create_mission` | 1 yoctoNEAR | MissionHub |
| Fund budget | `ft_transfer_call` msg `{"action":"fund_mission","mission_id":n}` | 1 yoctoNEAR | PAPER contract |
| Open, refund, submit, review, challenge, escalate, settle, claim | `open_mission`, `refund_unspent`, `submit_evidence`, `review_submission`, `challenge_submission`, `escalate_submission`, `settle_submission`, `claim_payout` | 1 yoctoNEAR | MissionHub |

Payout and acceptance cap start empty. The form rejects a cap outside 1–50 and rejects `@` in the public text. `list_missions` uses the same id cursor. The live first page is empty.

## Treasury

Default account `treasury.diabloodevs.testnet`.

| Action | Method | Deposit | Receiver |
| --- | --- | --- | --- |
| Donate | `ft_transfer_call` msg `{"action":"donate"}` | 1 yoctoNEAR | PAPER contract |
| Create proposal | `create_proposal` | 1 yoctoNEAR | Treasury |
| Approve | `approve_proposal` `{proposal_id}` | 1 yoctoNEAR | Treasury |
| Execute | `execute_proposal` `{proposal_id}` | 1 yoctoNEAR | Treasury |

Donation and proposal amount start empty. Creating a proposal does not reserve funds. Execution still needs two different approvers, the timelock, and an executor who is not an approver. Live assets and proposal list are empty. `list_proposals` uses the same id cursor.

## Explorer

Local rows come from `localStorage` key `paperhands.txs`, written only after a confirmed success. A typed hash is read with `confirmTransaction`. The page links to `https://testnet.nearblocks.io/address/<account>` and to `/paperhands-index`. It does not fetch `api-testnet.nearblocks.io` and does not fill missing rows. That JSON API returned HTTP 410/429 in earlier checks and is not a history source for this app.
