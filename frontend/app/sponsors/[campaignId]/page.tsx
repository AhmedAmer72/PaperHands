"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmAction, type ConfirmDetails } from "@/components/ConfirmAction";
import { PageHead } from "@/components/PageChrome";
import { Report } from "@/components/Report";
import { CONTRACT_ID, ONE_YOCTO, SPONSOR_CONTRACT_ID } from "@/lib/config";
import { paper } from "@/lib/format";
import { type TxReport, useWallet } from "@/lib/wallet";
import { type AccountingView, type CampaignView, type ParticipantView, campaign, campaignBooks, participant } from "@/lib/v3";

export default function CampaignPage() {
  const params = useParams<{ campaignId: string }>();
  const id = params.campaignId;
  const wallet = useWallet();
  const [item, setItem] = useState<CampaignView | null>(null);
  const [books, setBooks] = useState<AccountingView | null>(null);
  const [mine, setMine] = useState<ParticipantView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmDetails | null>(null);
  const [report, setReport] = useState<TxReport | null>(null);

  async function reload() {
    setItem(await campaign(SPONSOR_CONTRACT_ID, id));
    setBooks(await campaignBooks(SPONSOR_CONTRACT_ID, id));
    if (wallet.accountId) setMine(await participant(SPONSOR_CONTRACT_ID, id, wallet.accountId));
  }

  useEffect(() => {
    void reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, [id, wallet.accountId]);

  async function sign() {
    if (!confirming) return;
    const join = confirming.method === "ft_transfer_call";
    const result = await wallet.send(
      confirming.method,
      join
        ? { receiver_id: SPONSOR_CONTRACT_ID, amount: item?.commitment_amount, memo: null, msg: JSON.stringify({ action: "join", campaign_id: Number(id) }) }
        : { campaign_id: id },
      ONE_YOCTO,
      join ? CONTRACT_ID : SPONSOR_CONTRACT_ID,
    );
    setReport(result);
    setConfirming(null);
    if (result.ok) {
      try { await reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    }
  }

  function ask(method: string, role: string, amount: string, warning?: string) {
    setConfirming({
      title: "Confirm this campaign action",
      contract: method === "ft_transfer_call" ? CONTRACT_ID : SPONSOR_CONTRACT_ID,
      method,
      token: `PAPER · ${CONTRACT_ID} · 8 decimals`,
      amount,
      role,
      campaignId: id,
      warning,
      refundPath: "A failed transfer restores the claim. Principal does not expire. Unclaimed sponsor rewards return to the sponsor after 30 days.",
    });
  }

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow={item?.demo_clock ? "Demo campaign" : "Campaign"}
        lede={item?.description || "Campaign terms are read from SponsorHub."}
        title={item?.name || `Campaign ${id}`}
      />
      {error ? <p className="card p-5 text-sm">{error}</p> : null}
      {item ? (
        <article className="card grid gap-2 p-5 text-sm">
          <p>State {item.state}{item.success === null ? "" : item.success ? " · success" : " · failed"}</p>
          <p>Sponsor {item.sponsor_id}</p>
          <p>Contract {SPONSOR_CONTRACT_ID} · id {item.campaign_id}</p>
          <p>Reward deposited {paper(item.reward_amount)} · commitment {paper(item.commitment_amount)}</p>
          <p>Original {item.original_participants} · active {item.active_participants} · exits {item.early_exits} · retention {item.retention_bps / 100}%</p>
          <p>Minimum {item.min_original} · target {item.target_retention_bps / 100}% · cap {item.participant_cap}</p>
          <p>Early exit returns 950 PAPER. 25 goes to the survivor bonus and 25 to the protocol reserve. Nothing in that split is burned.</p>
          <p>{item.separate_lock ? "This lock is separate from Diamond Core." : ""}</p>
          {item.link ? <p>Link {item.link}</p> : null}
          <Link className="btn btn-green mt-3 w-fit" href={`/sponsors/${id}/manage`}>Sponsor ledger</Link>
        </article>
      ) : null}
      {books ? (
        <article className="card p-5 text-sm">
          <h2 className="font-display text-3xl">Ledger</h2>
          <p className="mt-2">Assets {paper(books.assets)}</p>
          <p>Principal {paper(books.principal_liability)} · sponsor reward {paper(books.sponsor_reward_liability)} · bonus {paper(books.survivor_bonus_liability)}</p>
          <p>Protocol reserve {paper(books.protocol_reserve)} · refund {paper(books.refund_liability)} · dust recorded {paper(books.dust_recorded)}</p>
          <p>Pending {paper(books.pending_transfer)} · difference {books.accounting_difference}</p>
        </article>
      ) : null}
      {mine ? <p className="text-sm">Your status {mine.status}. Principal available {paper(mine.principal_available)}.</p> : <p className="text-sm">No position is stored for the connected account.</p>}
      {item ? <div className="flex flex-wrap gap-3">
        <button className="btn btn-pink" onClick={() => {
          if (mine) {
            setConfirming(null);
            setReport({ ok: false, hash: null, method: "ft_transfer_call", detail: "This account already has a position in this campaign. A second join is rejected and no transaction was sent." });
            return;
          }
          ask("ft_transfer_call", "principal, a second lock", paper(item?.commitment_amount), "This locks another 1,000 PAPER in SponsorHub. It does not join your Diamond Core epoch and it does not extend that streak.");
        }} type="button">Join</button>
        <button className="btn btn-green" onClick={() => ask("cancel_join", "principal refund", paper(item?.commitment_amount))} type="button">Cancel during entry</button>
        <button className="btn btn-green" onClick={() => ask("exit_early", "early-exit return, not a burn", "950 PAPER")} type="button">Exit early</button>
        <button className="btn btn-cream" onClick={() => ask("activate_campaign", "no token amount", "0 PAPER", "Anyone can activate after the entry window. This does not move PAPER.")} type="button">Activate</button>
        <button className="btn btn-cream" onClick={() => ask("finalize_campaign", "no token amount", "0 PAPER", "Anyone can finalize after the campaign ends. Success and failure both split the survivor bonus.")} type="button">Finalize</button>
        <button className="btn btn-cream" onClick={() => ask("claim_principal", "principal", paper(mine?.principal_available || "0"))} type="button">Claim principal</button>
        <button className="btn btn-cream" onClick={() => ask("claim_survivor_bonus", "survivor bonus", paper(mine?.bonus_available || "0"))} type="button">Claim bonus</button>
        <button className="btn btn-cream" onClick={() => ask("claim_sponsor_reward", "sponsor reward", paper(mine?.sponsor_reward_available || "0"))} type="button">Claim sponsor reward</button>
      </div> : <p className="text-sm">Reading this campaign from SponsorHub.</p>}
      <ConfirmAction busy={wallet.busy} details={confirming} onCancel={() => setConfirming(null)} onConfirm={() => void sign()} />
      <Report report={report} />
    </section>
  );
}
