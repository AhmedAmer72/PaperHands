"use client";

import { useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { ONE_YOCTO, SPONSOR_CONTRACT_ID } from "@/lib/config";
import { type TxReport, useWallet } from "@/lib/wallet";
import { wholeToRaw } from "@/lib/v3";

export default function CreateSponsorPage() {
  const wallet = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [reward, setReward] = useState("1000");
  const [minimum, setMinimum] = useState("25");
  const [retention, setRetention] = useState("80");
  const [cap, setCap] = useState("25");
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function ask() {
    const raw = wholeToRaw(reward);
    const minOriginal = Number(minimum);
    const retentionBps = Number(retention) * 100;
    const participantCap = Number(cap);
    if (!name.trim() || !description.trim() || !raw || minOriginal < 25 || retentionBps < 8000 || participantCap < minOriginal || participantCap > 200) {
      setFormError("Use a name, a description, a positive PAPER reward, at least 25 originals, at least 80% retention, and a cap from that minimum up to 200.");
      return;
    }
    setFormError(null);
    setConfirming({
      title: "Create the campaign draft",
      contract: SPONSOR_CONTRACT_ID,
      method: "create_campaign",
      token: "No PAPER moves on this signature.",
      amount: `${reward} PAPER reward, still unfunded`,
      role: "draft terms, not principal",
      warning: "The clock matches this SponsorHub deployment. A demo hub can only create a 1 hour demo campaign. Funding is a second signature.",
      refundPath: "Before anyone joins, cancel returns the full reward deposit.",
    });
  }

  async function sign() {
    const raw = wholeToRaw(reward);
    if (!raw || !confirming) return;
    const result = await wallet.send(
      "create_campaign",
      {
        name,
        description,
        link,
        reward_amount: raw,
        min_original: Number(minimum),
        target_retention_bps: Number(retention) * 100,
        participant_cap: Number(cap),
      },
      ONE_YOCTO,
      SPONSOR_CONTRACT_ID,
    );
    setReport(result);
    setConfirming(null);
  }

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Sponsor wizard"
        lede="You choose a name, a fully funded PAPER reward, and thresholds that can only be stricter than 25 accounts and 80% retention. The duration is the deployment preset. It cannot be typed in."
        title="Set the terms, then fund them."
      />
      <form className="card grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); ask(); }}>
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Description" value={description} onChange={setDescription} />
        <Field label="Public link" value={link} onChange={setLink} />
        <Field label="Reward pool, whole PAPER" value={reward} onChange={setReward} />
        <Field label="Minimum originals" value={minimum} onChange={setMinimum} />
        <Field label="Retention percent" value={retention} onChange={setRetention} />
        <Field label="Participant cap" value={cap} onChange={setCap} />
        {formError ? <p className="text-sm text-orange">{formError}</p> : null}
        <button className="btn btn-pink w-fit" type="submit">Review draft</button>
      </form>
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input className="rounded-2xl border border-ink/10 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
