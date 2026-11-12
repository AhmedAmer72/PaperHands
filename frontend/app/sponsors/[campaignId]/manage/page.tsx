"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { CONTRACT_ID, ONE_YOCTO, SPONSOR_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type AccountingView, type CampaignView, campaign, campaignBooks } from "@/lib/v3";

export default function ManageCampaignPage() {
  const params = useParams<{ campaignId: string }>();
  const id = params.campaignId;
  const wallet = useWallet();
  const [item, setItem] = useState<CampaignView | null>(null);
  const [books, setBooks] = useState<AccountingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload() {
    setItem(await campaign(SPONSOR_CONTRACT_ID, id));
    setBooks(await campaignBooks(SPONSOR_CONTRACT_ID, id));
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [id]);

  async function sign() {
    if (!confirming || !item) return;
    const funding = confirming.method === "ft_transfer_call";
    const result = await wallet.send(
      confirming.method,
      funding
        ? { receiver_id: SPONSOR_CONTRACT_ID, amount: item.reward_amount, memo: null, msg: JSON.stringify({ action: "fund_reward", campaign_id: Number(id) }) }
        : { campaign_id: id },
      ONE_YOCTO,
      funding ? CONTRACT_ID : SPONSOR_CONTRACT_ID,
    );
    setReport(result);
    setConfirming(null);
    if (result.ok) {
      try { await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    }
  }

  function ask(method: string, role: string, amount: string) {
    setConfirming({
      title: "Sponsor action",
      contract: method === "ft_transfer_call" ? CONTRACT_ID : SPONSOR_CONTRACT_ID,
      method,
      token: `PAPER · ${CONTRACT_ID} · 8 decimals`,
      amount,
      role,
      campaignId: id,
      warning: "After the first join, these terms cannot be changed and the campaign cannot be cancelled.",
      refundPath: "A failed campaign returns the unspent reward to the sponsor. A failed transfer keeps the refund claimable.",
    });
  }

  const sponsor = wallet.accountId && item && wallet.accountId === item.sponsor_id;

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Sponsor dashboard"
        lede="Funded, distributed, claimable, refundable, and dust stay in separate rows. Storage and gas are not a protocol fee."
        title={item?.name || "Campaign ledger"}
      />
      {error ? <p className="card p-5 text-sm">{error}</p> : null}
      {item && books ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>State {item.state} · preset {item.preset}{item.demo_clock ? " · labelled demo" : ""}</p>
          <p>Funded {paper(item.reward_amount)} · assets {paper(books.assets)}</p>
          <p>Distributed or still claimable sponsor reward {paper(books.sponsor_reward_liability)}</p>
          <p>Refundable {paper(books.refund_liability)} · dust recorded {paper(books.dust_recorded)}</p>
          <p>Principal locked {paper(books.principal_liability)} · bonus {paper(books.survivor_bonus_liability)} · reserve {paper(books.protocol_reserve)}</p>
          <p>Original {item.original_participants} · survivors still active {item.active_participants} · exits {item.early_exits} · retention {item.retention_bps / 100}%</p>
          <p>Outcome {item.success === null ? "not finalized" : item.success ? "success" : "failed"} · accounting difference {books.accounting_difference}</p>
          <p>Protocol fee is 0. Attached NEAR on these buttons is gas and a 1 yoctoNEAR access-key guard, refunded except the yocto forwarded with a token transfer.</p>
        </article>
      ) : null}
      {sponsor ? (
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-pink" onClick={() => ask("ft_transfer_call", "sponsor reward deposit", paper(item?.reward_amount))} type="button">Fund the full pool</button>
          <button className="btn btn-green" onClick={() => ask("open_campaign", "no token amount", "0 PAPER")} type="button">Open entry</button>
          <button className="btn btn-green" onClick={() => ask("cancel_campaign", "refundable sponsor deposit", paper(books?.refund_liability || item?.reward_amount))} type="button">Cancel before any join</button>
          <button className="btn btn-cream" onClick={() => ask("refund_sponsor", "refundable sponsor balance", paper(books?.refund_liability))} type="button">Refund</button>
        </div>
      ) : <p className="text-sm">Connect the sponsor account to fund, open, cancel, or refund. Anyone can read this ledger.</p>}
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}
