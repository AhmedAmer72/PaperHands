# NEAR standards compliance

Date: 14 Nov 2026. Specs read from the NEAR NEPs repository (`nep-0141.md`, `nep-0145.md`, `nep-0148.md`, `nep-0297.md`) and checked against `contracts/paperhands` and the live `ft_metadata` view. The contract uses `near-sdk` `=5.30.1` and `near-contract-standards` `=5.30.1`.

## NEP-141

Status of the spec: Final. It requires NEP-297 events.

Implemented on Diamond Core through `near_contract_standards`:

| Method | Role |
| --- | --- |
| `ft_transfer` | Payable. Rejects the contract as receiver, then checks the accounting invariant. |
| `ft_transfer_call` | Payable. Same receiver rejection and accounting check. |
| `ft_resolve_transfer` | `#[private]`. Burns only if the sender is no longer registered, then checks accounting. |
| `ft_total_supply` | View. Live value `99446499999984`. |
| `ft_balance_of` | View. The app reads it for the connected account. |
| `storage_deposit` / `storage_balance_of` | NEP-145 storage management, from the standards crate. |

Transfers require 1 yoctoNEAR, enforced by the standards crate. The app attaches `"1"` for `ft_transfer_call`. Amounts are decimal strings.

The app does not implement a custom transfer. Joining a Diamond epoch is `join_epoch`, not a transfer to the contract. A transfer whose receiver is the contract is rejected with the message that tokens lock through `join_epoch`.

## NEP-145

Storage registration is the fungible-token storage API from `near-contract-standards`. The app's first storage action is `storage_deposit` with 0.05 NEAR attached. Measured commitment records in the unit tests are 274 bytes for the first join of an epoch (0.00274 NEAR) and 67 bytes for a later commitment (0.00067 NEAR). Unused attached NEAR is refunded. The commitment record stays after cancel and after claims, so that storage stake is not returned. The confirm copy says so.

## NEP-148

Live `ft_metadata` matches the spec version the contract stores:

- `spec`: `ft-1.0.0`
- `name`: PAPERHANDS
- `symbol`: PAPER
- `decimals`: 8
- `icon`: null
- `reference`: null
- `reference_hash`: null

`ft_metadata` also requires `self.config.spec == FT_METADATA_SPEC` before it returns. A null icon is allowed by the spec. The token has no icon and no off-chain reference document.

## NEP-297

Mints and burns emit `FtMint` and `FtBurn` from `near_contract_standards`. Those events use the standard name and the `EVENT_JSON:` prefix.

Protocol events in `contracts/paperhands/src/events.rs` also use `EVENT_JSON:`, but their `standard` field is `paperhands` and their `version` is `1.0.0`. Examples: `epoch_joined`, `commitment_locked`, `early_exit`, settlement events. That is a second event namespace, not a replacement for the ft events. Indexers that only subscribe to `standard: "nep141"` will see mints and burns and will not see the commitment events.

This app does not reconstruct a per-transaction mint and burn ledger from those logs. The economy page lists the cumulative counters on `get_protocol_balances` and says the logs are not scanned.

## Deviations that are intentional

- Demo clock. The live deployment is `demo-testnet` (1 hour / 10 minutes). Production parameters exist in source and are rejected if mixed with a faucet. They are not what is deployed.
- Full Access keys remain. NEP-141 does not make a contract immutable. The account key can still replace the wasm. See [CONTRACT_SECURITY_AUDIT.md](CONTRACT_SECURITY_AUDIT.md).
- No metadata icon or reference.
- Custom `paperhands` event standard alongside the ft events.
- Dust. Integer division burns the undistributable units. Live `total_dust_burned` is 16 smallest units, and supply is `994464.99999984` PAPER rather than a round 994,465. Accounting difference stays 0. The simulator's Balanced scenario documents the same rule (`1000999.99999990`).
