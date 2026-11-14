"use client";

import { useEffect, useId, useRef } from "react";
import { useWallet } from "@/lib/wallet";
import { MorphingSquare } from "@/components/ui/morphing-square";

export type ConfirmDetails = {
  title: string;
  contract: string;
  method: string;
  token: string;
  amount: string;
  role: string;
  campaignId?: string;
  subjectLabel?: string;
  warning?: string;
  refundPath: string;
};

export function ConfirmAction({
  details,
  busy,
  onConfirm,
  onCancel,
}: {
  details: ConfirmDetails | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const wallet = useWallet();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const signedOut = !wallet.accountId;

  useEffect(() => {
    if (!details) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusTarget = confirmRef.current?.disabled ? panelRef.current : confirmRef.current;
    focusTarget?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") cancelRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [details]);

  if (!details) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="card w-full max-w-xl border border-orange/40 p-5"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
        style={{ overscrollBehavior: "contain" }}
      >
        <h2 className="font-display text-3xl" id={titleId}>{details.title}</h2>
        <p className="mt-2 text-sm text-ink/70">Nothing is signed until you confirm. Closing the wallet is not a success.</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <Row label="Contract" value={details.contract} />
          <Row label="Method" value={details.method} />
          <Row label="Token" value={details.token} />
          <Row label="Amount" value={details.amount} />
          <Row label="This amount is" value={details.role} />
          {details.campaignId ? <Row label={details.subjectLabel ?? "Campaign"} value={details.campaignId} /> : null}
          <Row label="If it fails" value={details.refundPath} />
        </dl>
        {details.warning ? <p className="mt-4 text-sm font-semibold text-ink">{details.warning}</p> : null}
        {signedOut ? <p className="mt-4 text-sm font-semibold text-orange" role="alert">Connect a Testnet wallet before this can be signed.</p> : null}
        {busy ? <MorphingSquare className="mt-5 h-8 w-8" message="Waiting for the wallet…" messagePlacement="right" /> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn btn-pink" disabled={busy || signedOut} onClick={onConfirm} ref={confirmRef} type="button">
            {busy ? "Waiting for the wallet…" : signedOut ? "Connect a wallet first" : "Confirm and sign"}
          </button>
          <button className="btn btn-green" onClick={onCancel} type="button">Back</button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <dt className="text-ink/60">{label}</dt>
      <dd className="break-all tabular-nums" translate="no">{value}</dd>
    </div>
  );
}
