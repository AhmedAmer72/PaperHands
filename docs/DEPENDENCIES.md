# Dependency pins

Pinned on 10 November 2026. Both NEAR crates are exact versions on the same minor line.

| Crate or package | Pin | Why |
| --- | --- | --- |
| `near-sdk` | `=5.30.1` | `near-contract-standards` 5.30.1 depends on `near-sdk ~5.30.1`. Mixing 5.30.1 with the 5.29 standards crate does not compile. |
| `near-contract-standards` | `=5.30.1` | Published 5 November 2026. It exists, so the 5.29.1 pair from the skill text is not the pin. `rust-version` is 1.95. |
| Rust toolchain | `1.95.0` | SDK MSRV. `contracts/paperhands/rust-toolchain.toml`. |
| `near-sandbox` | `=0.4.0` | Integration tests. `near-workspaces` is not a dependency. |
| `near-api` | `=0.8.7` | Sandbox transactions and views. |
| `cargo-near-build` | `=0.11.5` | Sandbox builds the wasm with `no_wasmopt` because binaryen is not installed in this environment. |
| `cargo-near` | `0.23.0` | Used by `cargo near new` and `scripts/build-contract.sh`. The script passes `--no-wasmopt`, the same skip as the sandbox build. |
| `tokio` | `1.12.0` (full) | Sandbox runtime. |
| `testresult` | `0.4.1` | Sandbox test error type. |
| `@hot-labs/near-connect` | `0.12.0` | Wallet. `@near-wallet-selector` is not a dependency. |
| `near-api-js` | `7.4.0` | Views and transaction-status confirmation. |
| Next.js | `15.5.29` | App router. Production build uses webpack. Turbopack in 15.5.29 does not resolve the `file:../simulator` package. |
| Vitest | `3.2.7` | Simulator tests. |

The skill text that says "latest 5.29.x" was stale on this date. The assignment said to use a matching 5.30 pair when a 5.30 standards crate exists. It does.

`Cargo.toml` still records the generated reproducible-build image `sourcescan/cargo-near:0.22.0-rust-1.99.1` (`sha256:c9655eaf7436b90c87ea8b25739f91063032c5c30ba24cfeafe72c142943b5bb`). Tests were not built inside that image. The local toolchain is 1.95.0. `overflow-checks` is true for both `dev` and `release`.

`near-sdk` with the `unit-testing` feature is a dev-dependency only.
