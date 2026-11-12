"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageChrome";
import { confirmTransaction } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";

type LocalTx = { hash: string | null; method: string; ok: boolean; detail: string; accountId?: string; at?: number };

type RemoteTx = { hash: string; signer: string; method: string; when: string };

export default function ExplorerPage() {
  const wallet = useWallet();
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);
  const [account, setAccount] = useState("");
  const [hash, setHash] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const [remote, setRemote] = useState<RemoteTx[]>([]);
  const [raw, setRaw] = useState<string | null>(null);
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
        <h2 className="font-display text-4xl">Account history</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">NearBlocks is a public index. Amount and epoch are shown only when that response includes them. This list does not fill the gaps.</p>
        <form className="mt-4" onSubmit={(event) => {
          event.preventDefault();
          setRemote([]);
          setRaw(null);
          setError(null);
          const id = account.trim();
          if (!id) {
            setError("Type the account id first.");
            return;
          }
          void fetch(`https://api-testnet.nearblocks.io/v1/account/${id}/txns?page=1&per_page=15`).then(async (response) => {
            const body = await response.text();
            if (!response.ok) throw new Error(`NearBlocks HTTP ${response.status}: ${body.slice(0, 240)}`);
            setRaw(body.slice(0, 4000));
            const parsed = JSON.parse(body) as { txns?: unknown };
            if (!Array.isArray(parsed.txns)) throw new Error("NearBlocks did not return a txns array.");
            const rows: RemoteTx[] = [];
            for (const item of parsed.txns) {
              if (!item || typeof item !== "object") continue;
              const tx = item as Record<string, unknown>;
              const txHash = typeof tx.transaction_hash === "string" ? tx.transaction_hash : "";
              if (!txHash) continue;
              const actions = Array.isArray(tx.actions) ? tx.actions : [];
              const first = actions[0] && typeof actions[0] === "object" ? actions[0] as Record<string, unknown> : {};
              const method = typeof first.method === "string" ? first.method : "transaction";
              const signer = typeof tx.signer_account_id === "string" ? tx.signer_account_id : "—";
              const stamp = typeof tx.block_timestamp === "string" || typeof tx.block_timestamp === "number" ? String(tx.block_timestamp) : "";
              rows.push({ hash: txHash, signer, method, when: stamp ? stampFromNs(stamp) : "timestamp not in the response" });
            }
            setRemote(rows);
          }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
        }}>
          <button className="btn btn-green" type="submit">Load Testnet account history from NearBlocks</button>
        </form>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
        <ul className="mt-4 space-y-3 text-sm">
          {remote.map((tx) => (
            <li className="rounded-2xl bg-cream p-4" key={tx.hash}>
              <p className="font-semibold">{tx.method}</p>
              <p>{tx.signer}</p>
              <p className="text-ink/65">{tx.when}</p>
              <a className="break-all text-forest" href={`https://testnet.nearblocks.io/txns/${tx.hash}`}>{tx.hash}</a>
            </li>
          ))}
        </ul>
        {raw ? (
          <details className="faq">
            <summary>Raw NearBlocks response</summary>
            <pre className="mt-3 overflow-x-auto text-xs">{raw}</pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function stampFromNs(value: string) {
  try {
    const ms = Number(BigInt(value) / 1_000_000n);
    if (!Number.isFinite(ms) || ms < 1_000_000_000_000) return value;
    return new Date(ms).toISOString();
  } catch {
    return value;
  }
}
