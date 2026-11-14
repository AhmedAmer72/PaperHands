# Mock cleanup report

Date: 14 Nov 2026. This pass removed displayed values that pretended to be live contract state. It left published rules, the labeled simulator, and test-only Rust harnesses in place.

## Removed from the product UI

| Location | What was shown | What it shows now |
| --- | --- | --- |
| Home tokenomics cards | Hardcoded 1,000,000 / 700,000 / 300,000 as if they were the current reserves | `get_economic_config.initial_supply`, live `faucet_reserve`, live `burn_reserve`. Empty on RPC failure. |
| Economy headline | The same init split as the live reserves | The same three contract reads. Init cap is a note under the faucet card. |
| Explorer | A NearBlocks JSON account feed treated as history | Local receipts, an RPC hash lookup, and a link to the public NearBlocks page. No invented rows. |
| Home and index history | A short slice of epochs, and "no epochs" while the read was still running | `get_epoch` for every id from 0 through the current id. In-flight copy is "Reading every epoch from the contract." |
| Index open epochs | "Retention unread" | "Not settled" |
| Commitment failure rule and mint cap | Fixed "25 people or 80%" and "500 PAPER" | `get_economic_config` |
| Epoch times | Raw nanosecond integers | ISO timestamps when the value is a real time |
| Epoch status with no wallet | "not loaded" | "wallet off" |
| Sponsor create, missions, treasury forms | Sample amounts `1000`, `10`, `1` | Empty fields. Submit still requires a positive whole amount. |
| Sponsor, mission, and treasury lists | A single `list_*` page of 50 | Id cursor, 50 per page, up to 40 pages, including the indexer and sentinel scripts |

Browser check on 14 Nov 2026: faucet card `671000.00000000 PAPER`, burn card `294250.00000000 PAPER`, accounting difference 0. The 700,000 figure appears only as the init-cap note.

## Kept on purpose

- `/lab` stays. It is labeled SIMULATION and runs `paperhands-simulator`. It is not Testnet history.
- `/rules`, `/faq`, and `/how-it-works` keep the published protocol text, including the init supply and the 700,000 / 300,000 reserves. Those sentences describe deployment parameters, not the live balances.
- Home commitment rules still say the lock is 1,000 PAPER and the production epoch is 7 days. The card next to them reads this deployment's duration from `get_current_epoch`.
- Sponsor create still starts from the contract floors: 25 originals, 80% retention, cap 25. The reward amount is the field that was cleared.
- The early-exit button copy "950 PAPER" matches the immutable 5% penalty on a 1,000 PAPER lock.
- Rust tests still use `near_sdk::mock` and `near_sandbox`. Those are test harnesses. They are not imported by the frontend.
- The simulator's integer scenarios stay. Balanced supply is `1000999.99999990` because 10 smallest units of bonus dust are burned. That is the documented rounding, not a fake total.
- "Quotes unavailable" on sponsors stays disabled. Intents is not connected.

## Not a cleanup

Profile history was not expanded to every epoch. At epoch 82 that would add one `get_user_epoch_state` call per epoch on every profile view. The page shows the current epoch only. See [REMAINING_RISKS.md](REMAINING_RISKS.md).
