"use client";

import type { TxReport } from "@/lib/wallet";

export function Report({ report }: { report: TxReport | null }) {
  if (!report) return null;
  return (
    <aside aria-live="polite" className={`card mt-4 border p-4 text-sm ${report.ok ? "border-forest/30" : "border-orange/70"}`}>
      <p className={report.ok ? "font-semibold text-forest" : "font-semibold text-orange"}>
        {report.ok ? "The wallet and the network both confirmed this." : "This did not confirm."}
      </p>
      <p className="mt-2 text-ink/75">{report.ok ? "You can keep using this page. The figures refresh from the contract." : "Treat this attempt as unfinished. Fix the note below, then try the same action again."}</p>
      <p className="mt-2 break-all">Method: <span translate="no">{report.method}</span></p>
      <p className="mt-1 break-all">Hash: <span translate="no">{report.hash ?? "none returned"}</span></p>
      <p className="mt-2 text-ink/75">{report.detail}</p>
    </aside>
  );
}
