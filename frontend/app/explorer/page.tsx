"use client";

import { useEffect, useState } from "react";
import { confirmTransaction } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";

type LocalTx = { hash: string | null; method: string; ok: boolean; detail: string; accountId?: string; at?: number };

export default function ExplorerPage() {
  const wallet = useWallet();
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);
  const [account, setAccount] = useState("");
  const [hash, setHash] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem("paperhands.txs") || "[]") as LocalTx[];
    setLocalTxs(stored);
    if (wallet.accountId) setAccount(wallet.accountId);
  }, [wallet.accountId]);

  return (
    <section>
      <h1 className="text-4xl">Transaction explorer</h1>
      <p className="mt-3 max-w-3xl text-ink/70">
        Hashes come from a wallet response or from a lookup you type. Status comes from the Testnet RPC.
        This page does not decide qualification, mint, burn, or streak, and it does not invent hashes.
      </p>
      <h2 className="mt-8 text-2xl">Submitted in this browser</h2>
      <ul className="mt-3 space-y-3 text-sm">
        {localTxs.length === 0 ? <li className="text-ink/60">No local transactions yet.</li> : null}
        {localTxs.map((tx) => (
          <li className="rounded-lg bg-white p-3" key={`${tx.hash}-${tx.at}`}>
            <p>{tx.ok ? "RPC SuccessValue" : "Not confirmed"} · {tx.method}</p>
            <p className="break-all">{tx.hash ?? "no hash"}</p>
            <p className="text-ink/70">{tx.detail}</p>
          </li>
        ))}
      </ul>
      <form className="mt-8 flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setLookup(null);
        void confirmTransaction(hash.trim(), account.trim() || wallet.accountId || "").then((result) => {
          setLookup(`${result.ok ? "SuccessValue" : "Not SuccessValue"}. ${result.detail}`);
        }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
      }}>
        <input className="min-w-64 rounded bg-white px-3 py-2" onChange={(event) => setHash(event.target.value)} placeholder="transaction hash" value={hash} />
        <input className="min-w-64 rounded bg-white px-3 py-2" onChange={(event) => setAccount(event.target.value)} placeholder="signer account" value={account} />
        <button className="rounded-full bg-cyan px-4 py-2 text-charcoal" type="submit">Read RPC status</button>
      </form>
      {lookup ? <p className="mt-3 break-all text-sm">{lookup}</p> : null}
      <form className="mt-8" onSubmit={(event) => {
        event.preventDefault();
        setRemote(null);
        setError(null);
        const id = account.trim();
        void fetch(`https://api-testnet.nearblocks.io/v1/account/${id}/txns?page=1&per_page=15`).then(async (response) => {
          const body = await response.text();
          if (!response.ok) throw new Error(`NearBlocks HTTP ${response.status}: ${body.slice(0, 240)}`);
          setRemote(body.slice(0, 4000));
        }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
      }}>
        <button className="rounded-full border border-ink/15 px-4 py-2 text-sm" type="submit">Load Testnet account history from NearBlocks</button>
      </form>
      {error ? <p className="mt-3 text-sm text-orange">{error}</p> : null}
      {remote ? <pre className="mt-3 overflow-x-auto rounded bg-white p-3 text-xs">{remote}</pre> : null}
    </section>
  );
}
