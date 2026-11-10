# Security assumptions

The contract has no admin withdrawal, no pause, no parameter setter, and no upgrade method. Calling `upgrade` or `set_config` does not find a method.

That is not full code immutability. Whoever holds a full-access key on the contract account can still deploy different code with a NEAR deploy transaction. Removing that key is a separate step. This build does not remove keys, does not create accounts, and does not deploy. Do not describe the contract as immutable until the owner has removed the deploy key and recorded that transaction.

Checked arithmetic is on in debug and release. Direct PAPER transfers to the contract account are rejected. Finalization and sweep are permissionless and sequential. A caller cannot finalize a future epoch or finalize the same epoch twice.

One yoctoNEAR on the protocol methods stops someone from attaching a function call inside another contract without a deposit. It does not authenticate a person.

The frontend marks a transaction successful only when the wallet outcome has `SuccessValue` and a Testnet RPC status read also has `SuccessValue`. A wallet popup alone is not success. The explorer does not invent hashes.
