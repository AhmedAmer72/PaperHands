const CENT = 1_000_000n;

export function paper(units: string | number | null | undefined): string {
  if (units === null || units === undefined || units === "") return "—";
  try {
    return `${formatPaperAmount(BigInt(units))} PAPER`;
  } catch {
    return String(units);
  }
}

function formatPaperAmount(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const cents = (abs + CENT / 2n) / CENT;
  const whole = cents / 100n;
  const frac = cents % 100n;
  const grouped = whole.toLocaleString("en-US");
  if (frac === 0n) return `${sign}${grouped}`;
  const digits = frac.toString().padStart(2, "0").replace(/0$/, "");
  return `${sign}${grouped}.${digits}`;
}

export function percentFromBps(bps: number | null | undefined): string {
  if (bps == null || !Number.isFinite(bps)) return "—";
  const whole = Math.trunc(bps / 100);
  const frac = Math.abs(Math.trunc(bps) % 100);
  if (frac === 0) return `${whole}%`;
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}%`;
}

export function durationLabel(ns: string | undefined): string {
  if (!ns) return "—";
  if (ns === "3600000000000") return "1 hour";
  if (ns === "600000000000") return "10 minutes";
  if (ns === "604800000000000") return "7 days";
  if (ns === "86400000000000") return "24 hours";
  return `${ns} ns`;
}

export function clockLabel(demo: boolean | undefined): string {
  if (demo === undefined) return "—";
  return demo ? "1 hour · entry 10 minutes" : "7 days · entry 24 hours";
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

