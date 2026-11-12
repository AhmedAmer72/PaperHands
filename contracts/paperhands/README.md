# PAPERHANDS contract

Rust contract for the PAPERHANDS fungible token and commitment protocol. The repo guide is the root [README](../../README.md). Economic rules are in [docs/ECONOMIC_INVARIANTS.md](../../docs/ECONOMIC_INVARIANTS.md). Pins are in [docs/DEPENDENCIES.md](../../docs/DEPENDENCIES.md).

```bash
cargo test --lib --offline
cargo test --test test_basics --offline -- --test-threads=1
```

`near-sdk` and `near-contract-standards` are both `=5.30.1`. There is no upgrade method and no admin setter. A demo init uses a 1 hour epoch. That is not a 7 day production epoch.
