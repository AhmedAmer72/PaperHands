# Frontend QA

Checked on 11 Nov 2026 against the dev server on port 3456. The app defaults to `diabloodevs.testnet`.

## Routes

Each of these returned HTTP 200:

`/`, `/how-it-works`, `/commitment`, `/paperhands-index`, `/economy`, `/explorer`, `/lab`, `/rules`, `/faq`.

The economy page, after the client read the contract, showed:

- Contract `diabloodevs.testnet`
- Demo banner: 1 hour epochs, 10 minute entry, faucet on, not Sybil-proof
- Live supply `1000000.00000000` PAPER
- Contract balance `975000.00000000` PAPER
- Faucet reserve `675000.00000000` PAPER
- Burn reserve `300000.00000000` PAPER
- Accounting difference `0`

Those figures match the RPC after 25 faucet claims. The 700,000 and 300,000 cards on that page are the init rules. The live books are the lower section.

## Wallet policy

`frontend/lib/wallet.tsx` marks a call successful only when the wallet status contains `SuccessValue` and the RPC confirmation is also successful. A thrown wallet error is stored and returned as `ok: false`. Mainnet is refused.

## Actions that exist in the UI

- Commitment: storage deposit (`0.05` NEAR), faucet (`0.05` NEAR), join (`0.1` NEAR), cancel, early exit. The checkbox gates the buttons.
- Epoch page: finalize, claim principal, claim rewards (mint and bonus together), sweep. Each attaches `0.1` NEAR through `DEPOSIT_JOIN`. The contract refunds the unused part. Those deposits were not changed.
- Measured storage in the unit test is still the figure the UI quotes: the first join in an epoch writes the epoch record (274 bytes in the earlier measurement) and a later join writes 67 bytes. At `10^19` yoctoNEAR per byte, 67 bytes is `0.00067` NEAR. The `0.1` NEAR attachment covers it and is refunded down.

## Not verified in a browser wallet

Connect, disconnect, rejection, low balance, and a signed click-through were not driven through a wallet popup. The demo transactions were signed with the account keys via `near-cli-rs`. The economy page did prove that the same contract views render.

## Console

Headless Chrome logs dbus noise in this environment. No application exception was printed in the economy render. A full interactive console pass in the owner's browser was not done.
