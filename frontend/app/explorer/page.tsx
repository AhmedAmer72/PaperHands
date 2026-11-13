"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { confirmTransaction } from "@/lib/chain";
import { CONTRACT_ID } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

type LocalTx = { hash: string | null; method: string; ok: boolean; detail: string; accountId?: string; at?: number };

export default function ExplorerPage() {
  const wallet = useWallet();
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);
  const [account, setAccount] = useState("");
  const [hash, setHash] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem("paperhands.txs") || "[]") as LocalTx[];
    setLocalTxs(stored);
    if (wallet.accountId) setAccount(wallet.accountId);
  }, [wallet.accountId]);

  return (
    <section className="space-y-8">
      <PageHead
        eyebrow="Activity"
        lede="Hashes come from a wallet response or from a lookup you type. Status comes from the Testnet RPC. This page does not decide qualification, mint, burn, or streak, and it does not invent hashes."
        title="Only receipts we can point at"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-4xl">This browser</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {localTxs.length === 0 ? <li className="text-ink/60">No local transactions yet.</li> : null}
            {localTxs.map((tx) => (
              <li className="rounded-2xl bg-cream p-4" key={`${tx.hash}-${tx.at}`}>
                <p className="font-semibold">{tx.ok ? "RPC SuccessValue" : "Not confirmed"} · {tx.method}</p>
                <p className="mt-1 break-all">{tx.hash ?? "no hash"}</p>
                {tx.hash ? <a className="mt-1 inline-block text-forest" href={`https://testnet.nearblocks.io/txns/${tx.hash}`}>Open on NearBlocks</a> : null}
                <p className="mt-2 text-ink/70">{tx.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-4xl">Read one hash</h2>
          <form className="mt-4 grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setLookup(null);
            void confirmTransaction(hash.trim(), account.trim() || wallet.accountId || "").then((result) => {
              setLookup(`${result.ok ? "SuccessValue" : "Not SuccessValue"}. ${result.detail}`);
            }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
          }}>
            <input className="rounded-full bg-cream px-4 py-3" onChange={(event) => setHash(event.target.value)} placeholder="transaction hash" value={hash} />
            <input className="rounded-full bg-cream px-4 py-3" onChange={(event) => setAccount(event.target.value)} placeholder="signer account" value={account} />
            <button className="btn btn-pink" type="submit">Read RPC status</button>
          </form>
          {lookup ? <p className="mt-4 break-all text-sm">{lookup}</p> : null}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-4xl">Where the full history lives</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">
          Epoch settlement is on the index. A hash you already have can be read above. This page does not call the NearBlocks JSON API and does not invent rows when that API is unavailable.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn btn-green" href={`https://testnet.nearblocks.io/address/${account.trim() || CONTRACT_ID}`}>Open this account on NearBlocks</a>
          <a className="btn btn-cream" href="/paperhands-index">Open every epoch</a>
        </div>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
      </div>
    </section>
  );
}
