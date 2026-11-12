"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CONTRACT_ID, DEPOSIT_JOIN, GAS, MAINNET_REFUSED } from "./config";
import { confirmTransaction } from "./chain";

export type TxReport = {
  ok: boolean;
  hash: string | null;
  detail: string;
  method: string;
};

type Call = { method: string; args: Record<string, unknown>; deposit: string };

type WalletApi = {
  accountId: string | null;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (method: string, args: Record<string, unknown>, deposit?: string) => Promise<TxReport>;
  sendMany: (calls: Call[]) => Promise<TxReport>;
};

const WalletContext = createContext<WalletApi | null>(null);

function hashFrom(outcome: unknown): string | null {
  const value = outcome as {
    transaction?: { hash?: string };
    transaction_outcome?: { id?: string };
  };
  return value?.transaction?.hash || value?.transaction_outcome?.id || null;
}

function walletSaidSuccess(outcome: unknown): boolean {
  const status = (outcome as { status?: unknown }).status;
  if (!status || typeof status !== "object") return false;
  return "SuccessValue" in status && !("Failure" in status);
}

function remember(report: TxReport, accountId: string) {
  if (!report.hash || typeof window === "undefined") return;
  const key = "paperhands.txs";
  const prior = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown[];
  const next = [{ ...report, accountId, at: Date.now() }, ...prior].slice(0, 40);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connector, setConnector] = useState<{
    connect: () => Promise<{ getAccounts: () => Promise<Array<{ accountId: string }>> }>;
    disconnect: () => Promise<void>;
    wallet: () => Promise<{
      signAndSendTransaction: (params: {
        signerId: string;
        receiverId: string;
        actions: Array<{ type: "FunctionCall"; params: { methodName: string; args: object; gas: string; deposit: string } }>;
      }) => Promise<unknown>;
      signAndSendTransactions: (params: {
        signerId: string;
        transactions: Array<{
          receiverId: string;
          actions: Array<{ type: "FunctionCall"; params: { methodName: string; args: object; gas: string; deposit: string } }>;
        }>;
      }) => Promise<unknown[]>;
    }>;
  } | null>(null);

  useEffect(() => {
    if (MAINNET_REFUSED) return;
    let cancelled = false;
    void (async () => {
      const { NearConnector } = await import("@hot-labs/near-connect");
      const next = new NearConnector({ network: "testnet" });
      if (cancelled) return;
      setConnector(next as unknown as NonNullable<typeof connector>);
      try {
        const connected = await next.getConnectedWallet();
        if (!cancelled) setAccountId(connected.accounts[0]?.accountId ?? null);
      } catch {
        // No restored session. That is not a failed transaction.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function finish(method: string, outcome: unknown, signer: string): Promise<TxReport> {
    const hash = hashFrom(outcome);
    if (!hash) {
      return { ok: false, hash: null, method, detail: "The wallet did not return a transaction hash. Nothing was marked successful." };
    }
    const rpc = await confirmTransaction(hash, signer);
    const walletOk = walletSaidSuccess(outcome);
    const ok = walletOk && rpc.ok;
    const detail = ok
      ? `${rpc.detail} Views should be read again from the contract.`
      : `Wallet success flag: ${walletOk}. ${rpc.detail}`;
    const report = { ok, hash, method, detail };
    remember(report, signer);
    return report;
  }

  async function send(method: string, args: Record<string, unknown>, deposit = DEPOSIT_JOIN): Promise<TxReport> {
    if (MAINNET_REFUSED) return { ok: false, hash: null, method, detail: "This MVP refuses mainnet." };
    if (!CONTRACT_ID) return { ok: false, hash: null, method, detail: "No contract id is configured. No transaction was sent." };
    if (!connector || !accountId) return { ok: false, hash: null, method, detail: "Connect a Testnet wallet first. No transaction was sent." };
    setBusy(true);
    setError(null);
    try {
      const wallet = await connector.wallet();
      const outcome = await wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: CONTRACT_ID,
        actions: [{ type: "FunctionCall", params: { methodName: method, args, gas: GAS, deposit } }],
      });
      return await finish(method, outcome, accountId);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : String(caught);
      setError(detail);
      return { ok: false, hash: null, method, detail };
    } finally {
      setBusy(false);
    }
  }

  async function sendMany(calls: Call[]): Promise<TxReport> {
    const method = calls.map((call) => call.method).join("+");
    if (MAINNET_REFUSED) return { ok: false, hash: null, method, detail: "This MVP refuses mainnet." };
    if (!CONTRACT_ID || !connector || !accountId) {
      return { ok: false, hash: null, method, detail: "Connect a wallet to a configured Testnet contract first." };
    }
    setBusy(true);
    setError(null);
    try {
      const wallet = await connector.wallet();
      const outcomes = await wallet.signAndSendTransactions({
        signerId: accountId,
        transactions: calls.map((call) => ({
          receiverId: CONTRACT_ID,
          actions: [{ type: "FunctionCall", params: { methodName: call.method, args: call.args, gas: GAS, deposit: call.deposit } }],
        })),
      });
      return await finish(method, outcomes[outcomes.length - 1], accountId);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : String(caught);
      setError(detail);
      return { ok: false, hash: null, method, detail };
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (MAINNET_REFUSED) {
      setError("This MVP refuses mainnet.");
      return;
    }
    if (!connector) {
      setError("Wallet connector is still loading.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const wallet = await connector.connect();
      const accounts = await wallet.getAccounts();
      setAccountId(accounts[0]?.accountId ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await connector?.disconnect();
    setAccountId(null);
  }

  return (
    <WalletContext.Provider value={{ accountId, busy, error, connect, disconnect, send, sendMany }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletApi {
  const value = useContext(WalletContext);
  if (!value) throw new Error("WalletProvider missing");
  return value;
}
