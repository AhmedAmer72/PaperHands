# Deployment security

Network: NEAR Testnet. No Mainnet transaction was sent.

## Account

`diabloodevs.testnet`

- Liquid balance at audit: about 4.998 NEAR.
- Code hash: `H5f6eermchQ1DsE4mqCVpQh9AwUd8zUgosrsEkEJuCkd`.
- That hash is the base58 SHA-256 of `contracts/paperhands/target/near/paperhands.wasm` (290,237 bytes, SHA-256 `eeec6413abc686473388933a28c82be0003c2685f8408330b1de973632e2cafe`).
- Deploy transaction: [CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp](https://explorer.testnet.near.org/transactions/CqnRFKQukKcCvvQJnhX5JB3BCpmJLxi9rkRAhRpCeezp).
- Init transaction: [AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur](https://explorer.testnet.near.org/transactions/AK9eTCZxXt9tCJHhKUVHLydE7P6auRQfi2BRHn3T7yur).

The wasm was not replaced in this pass. `new` was not called again.

## Keys

One access key: `ed25519:8V1rimz5fxrnYszwTzXJ6JWkf2f7CTCxB6RzTTvo1yQQ`. Permission: `FullAccess`.

A full-access key can deploy new code, call any method, and transfer NEAR. The contract has no upgrade method of its own, but this key is still an upgrade authority. The contract is not permanently immutable.

The key was not removed and was not replaced.

## Economic authority inside the wasm

- No public setter for epoch length, entry window, faucet flag, mint rate, or reserves.
- Mint paths are `new` (already used) and graded emission inside `finalize_epoch`.
- Burns are early-exit penalties, bonus dust, failed-epoch reserve burns, and sweeps of expired reward liabilities.
- There is no owner withdrawal of user principal or of the reserves.

## Demo accounts

`paperhandsph00.testnet` through `paperhandsph24.testnet` each have their own full-access key, created by the Testnet faucet. Those keys are outside the git tree. They are not the contract's upgrade key.
