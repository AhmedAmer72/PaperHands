# PAPERHANDS frontend

Next.js app. Wallet code uses `@hot-labs/near-connect` and `near-api-js`. It does not use `@near-wallet-selector`.

```bash
npm run build
npm run dev
```

The app reads `diabloodevs.testnet` unless `NEXT_PUBLIC_CONTRACT_ID` is set to another account. Copy `../.env.example` to `.env.local` to override it. Pages do not invent a 7 day epoch or a successful transaction.

`next build` uses webpack. Turbopack 15.5.29 does not resolve the local `paperhands-simulator` package. The lab page is a simulation. Its Balanced supply is `1000999.99999990` PAPER.
