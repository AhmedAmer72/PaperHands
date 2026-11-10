# PAPERHANDS frontend

Next.js app. Wallet code uses `@hot-labs/near-connect` and `near-api-js`. It does not use `@near-wallet-selector`.

```bash
npm run build
npm run dev
```

Copy `../.env.example` to `.env.local` and set `NEXT_PUBLIC_CONTRACT_ID` after a real Testnet deploy. With that variable empty, the pages say the contract is not connected. They do not invent a 7 day epoch or a successful transaction.

`next build` uses webpack. Turbopack 15.5.29 does not resolve the local `paperhands-simulator` package. The lab page is a simulation. Its Balanced supply is `1000999.99999990` PAPER.
