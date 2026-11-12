# Explorer verification

The activity page is `frontend/app/explorer/page.tsx`. It is a reader. It does not decide who qualified, what was minted, or what was burned.

## What it shows

- Receipts this browser stored in `localStorage` under `paperhands.txs`, after `wallet.tsx` has a hash. Each row says whether the RPC result was `SuccessValue`.
- A form that calls `confirmTransaction` for a hash the user types. The status comes from the Testnet RPC.
- A NearBlocks account list. Amount and epoch are shown only when that response includes them. The raw response stays in a details element.

Empty local history says "No local transactions yet." A missing contract id does not invent rows.

## What it does not show

There is no contract-event indexer. Mints, burns, joins, cancels, exits, bonuses, finalization, claims, and faucet claims appear on this page only when a hash is already known or NearBlocks returns the transaction. The contract logs are the source of those events. This page does not reconstruct a missing event.

NearBlocks downtime leaves the RPC lookup and the local list. It does not fill the gap with sample rows.

## This pass

The demo transactions are listed with hashes in `docs/TESTNET_ACCOUNTS.md` and `docs/TESTNET_E2E_REPORT.md`. They were read from `near-cli` and the RPC, not typed into the explorer as if the page had indexed them.
