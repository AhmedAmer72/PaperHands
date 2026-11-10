# Visual implementation

The contract, the simulator, and the token rules were not changed. This pass replaces the landing page and restyles the existing screens so they stay readable on the cream field.

## What changed

| File | Change |
| --- | --- |
| `frontend/app/globals.css` | Design tokens, Anton and Poppins, hero, cards, buttons, reduced motion. |
| `frontend/app/page.tsx` | Renders `HomeExperience` instead of the old dashboard. |
| `frontend/components/HomeExperience.tsx` | New landing: hero, community, commitment comparison, steps, index, tokenomics, activity, FAQ, footer. |
| `frontend/components/Shell.tsx` | Sticky forest pill navigation. Full links from 1024px. Menu below that. |
| `frontend/components/Report.tsx` | Success and failure colors on the cream page. |
| `frontend/app/layout.tsx` | Description updated. |
| `frontend/app/commitment/page.tsx` | Same calls and the same confirm checkbox. Buttons use the pill styles. |
| `frontend/app/economy/page.tsx`, `epoch/[id]/page.tsx`, `explorer/page.tsx`, `lab/page.tsx`, `paperhands-index/page.tsx`, `rules/page.tsx` | Text and card colors retargeted to ink on cream. Calls unchanged. |
| `frontend/public/fonts/` | Fontsource Anton and Poppins, SIL OFL. |
| `frontend/public/assets/paperhands/paper-hand/hero.webp` | Original origami hand. |
| `frontend/public/assets/paperhands/diamond-hand/hero.webp` | Original crystal hand. |
| `docs/design-audit.md`, `docs/design-system.md`, `design-reference/phamily-pharma/` | Audit, tokens, and the reference inventory. |

`frontend/components/Hands.tsx` is the old flat SVG pair. Nothing imports it. It was left in place.

The product routes are separate pages, not only sections of the landing page: `/how-it-works`, `/commitment`, `/paperhands-index`, `/epoch/[id]`, `/economy`, `/explorer`, `/lab`, `/rules`, and `/faq`. They share `frontend/components/PageChrome.tsx`. The commitment page keeps the disclosure checkbox and the same five contract methods. The lab page still labels every scenario as a simulation.

No dependency was added. Motion is CSS.

## Responsive behavior

- From 1024px up, the hands are absolutely placed on the sides of the green hero and the nav shows every route.
- Under 1024px, a Menu button opens the same routes. Checked at 768 and 390: the button is `display: flex`, and clicking it reveals Home, Commitment, Index, Economy, Explorer, Lab, and Rules.
- Under 900px, the hands leave the absolute layout and sit in a row under the two calls to action, at 11.5rem tall.
- `documentElement.scrollWidth` matched the viewport at 1440, 1920, 768, and 390. No horizontal overflow on those checks.

## Data rules that stayed

- Epoch, retention, active accounts, streaks, locked PAPER, and supply render only after `get_current_epoch`, `get_protocol_balances`, and `get_epoch`. With no `NEXT_PUBLIC_CONTRACT_ID`, those cells are dashes or the existing "contract is not connected" sentence.
- The 1,000 PAPER commitment, 7 day production duration, 5% penalty, 80% retention, 25 participant minimum, and 500 PAPER mint cap are protocol constants. The page also shows this deployment's real duration once the contract answers, and it does not call a demo epoch a seven-day epoch.
- Activity rows come from `localStorage` key `paperhands.txs` or from NearBlocks for the configured account. Amount and epoch are omitted when the response does not include them. Nothing is invented.
- A wallet action is still marked successful only when the wallet and the RPC both return SuccessValue.

## Screenshots

Taken from the production build at `http://127.0.0.1:3456`:

- `docs/screenshots/desktop-1440-hero.png`
- `docs/screenshots/desktop-1440-commitment.png`
- `docs/screenshots/desktop-1440-index.png`
- `docs/screenshots/desktop-1440-tokenomics.png`
- `docs/screenshots/desktop-1920-hero.png`
- `docs/screenshots/tablet-768-hero.png`
- `docs/screenshots/mobile-390-hero.png`
- `docs/screenshots/mobile-390-menu.png`
- `docs/screenshots/mobile-390-commitment.png`
- `docs/screenshots/mobile-390-footer.png`

## Functional check

### Passed

- `cd frontend && npx tsc --noEmit` exited 0.
- `cd frontend && npx next build` compiled and generated all 11 routes. First load for `/` is 186 kB.
- Hero, commitment comparison, index, and tokenomics render with the real empty-contract copy. No sample numbers.
- Diamond comparison card computed style is `rgb(9, 84, 61)` background and `rgb(255, 253, 247)` text.
- On `/commitment`, Sign join stays disabled at opacity 0.45 until the disclosure checkbox is checked, then it enables and its background is `rgb(255, 169, 233)`.
- Page resources from the local server returned no HTTP 4xx during that session.
- Desktop Menu button computed `display: none` at 1440. Mobile Menu computed `display: flex` and opened the route list.

### Failed

None in the checks above.

### Not tested

- Connecting a wallet, signing, or rejecting a transaction. This environment has no Testnet wallet.
- `join_epoch`, `cancel_during_entry`, `exit_early`, `finalize_epoch`, principal claims, reward claims, or sweep. There is no deployed contract and `NEXT_PUBLIC_CONTRACT_ID` is empty.
- A NearBlocks feed with a real account.
- The Rust unit tests, sandbox tests, and simulator tests were not run again. Those files were not edited.
- Hover, focus, and `prefers-reduced-motion` were implemented and not filmed.
- Inner routes other than `/` and `/commitment` were built and spot-checked for contrast earlier in the pass. They were not clicked through a wallet flow.

### Known issues

- The open-epoch active count requires a configured contract. Until then the hero shows an em dash.
- NearBlocks rows show method, signer, time, and hash. They do not show an amount or an epoch id unless that payload includes them.
- The two hero images are the only original illustrations. Early-exit and success poses were not drawn.
- `Hands.tsx` is unused.
- This build is not deployed and is not production-ready. The faucet is not Sybil-proof. A demo epoch is one hour, not seven days.
