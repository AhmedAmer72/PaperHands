export const RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.testnet.near.org";
export const NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet";
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "diabloodevs.testnet";

export const MAINNET_REFUSED = NETWORK === "mainnet";

export const COMMITMENT_STORAGE_BYTES = 67;
export const FIRST_JOIN_STORAGE_BYTES = 274;
export const COMMITMENT_STORAGE_YOCTO = "670000000000000000000";

export const GAS = "200000000000000";
export const ONE_YOCTO = "1";
export const DEPOSIT_JOIN = "100000000000000000000000";
export const DEPOSIT_STORAGE = "50000000000000000000000";
