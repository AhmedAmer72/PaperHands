"use client";

import type { TxReport } from "@/lib/wallet";

export function Report({ report }: { report: TxReport | null }) {
  if (!report) return null;
  return (
    <aside className={`mt-4 rounded-lg border p-4 text-sm ${report.ok ? "border-cyan/50" : "border-orange/70"}`}>
      <p className="text-orange">{report.ok ? "RPC confirmed SuccessValue." : "Not a confirmed success."}</p>
      <p className="mt-2 break-all">Method: {report.method}</p>
      <p className="mt-1 break-all">Hash: {report.hash ?? "none returned"}</p>
      <p className="mt-2 text-paper/80">{report.detail}</p>
    </aside>
  );
}
