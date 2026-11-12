"use client";

export type ConfirmDetails = {
  title: string;
  contract: string;
  method: string;
  token: string;
  amount: string;
  role: string;
  campaignId?: string;
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
  if (!details) return null;
  return (
    <section className="card border border-orange/40 p-5">
      <h2 className="font-display text-3xl">{details.title}</h2>
      <p className="mt-2 text-sm text-ink/70">Nothing is signed until you confirm. Closing the wallet is not a success.</p>
      <dl className="mt-4 grid gap-2 text-sm">
        <Row label="Contract" value={details.contract} />
        <Row label="Method" value={details.method} />
        <Row label="Token" value={details.token} />
        <Row label="Amount" value={details.amount} />
        <Row label="This amount is" value={details.role} />
        {details.campaignId ? <Row label="Campaign" value={details.campaignId} /> : null}
        <Row label="If it fails" value={details.refundPath} />
      </dl>
      {details.warning ? <p className="mt-4 text-sm font-semibold text-ink">{details.warning}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn btn-pink" disabled={busy} onClick={onConfirm} type="button">
          {busy ? "Waiting for the wallet" : "Confirm and sign"}
        </button>
        <button className="btn btn-green" onClick={onCancel} type="button">Back</button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <dt className="text-ink/60">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
