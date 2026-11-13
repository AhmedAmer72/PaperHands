import { formatPaper } from "paperhands-simulator";

export function paper(units: string | number | null | undefined): string {
  if (units === null || units === undefined || units === "") return "—";
  try {
    return `${formatPaper(BigInt(units))} PAPER`;
  } catch {
    return String(units);
  }
}

export function durationLabel(ns: string | undefined, kind: string | undefined): string {
  if (!ns) return "duration unknown until the contract answers";
  if (kind === "demo-testnet" && ns === "3600000000000") return "1 hour (demo-testnet, not a 7-day production epoch)";
  if (kind === "demo-testnet" && ns === "600000000000") return "10 minutes (demo entry window)";
  if (kind === "production" && ns === "604800000000000") return "7 days (production)";
  if (kind === "production" && ns === "86400000000000") return "24 hours (production entry)";
  return `${ns} ns`;
}

export function timestampLabel(ns: string | null | undefined): string {
  if (!ns) return "—";
  try {
    const ms = Number(BigInt(ns) / 1_000_000n);
    if (!Number.isFinite(ms) || ms < 1_000_000_000_000) return ns;
    return new Date(ms).toISOString();
  } catch {
    return ns;
  }
}

export function remaining(nowNs: string, endNs: string): string {
  try {
    const left = BigInt(endNs) - BigInt(nowNs);
    if (left <= 0n) return "window closed";
    const seconds = left / 1_000_000_000n;
    const hours = seconds / 3600n;
    const minutes = (seconds % 3600n) / 60n;
    return `${hours.toString()}h ${minutes.toString()}m`;
  } catch {
    return "unknown";
  }
}

export function deploymentBanner(kind: string | undefined, faucet: boolean | undefined): string {
  if (kind === "demo-testnet") {
    return "Demo deployment. Epochs last 1 hour and the entry window is 10 minutes. This is not a seven-day production epoch. The faucet is on and is not Sybil-proof.";
  }
  if (kind === "production") {
    return "Production parameters: 7-day epochs, 24-hour entry, faucet off. This build has not deployed it.";
  }
  if (faucet) return "Faucet flag is on. Treat the duration as whatever the contract reports, not as a 7-day production epoch.";
  return "Deployment kind has not been read from a contract.";
}
