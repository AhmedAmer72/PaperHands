"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTRACT_ID, MAINNET_REFUSED, NETWORK } from "@/lib/config";
import { WalletProvider, useWallet } from "@/lib/wallet";
import { DiamondHand, PaperHand } from "./Hands";

const LINKS = [
  ["/", "Dashboard"],
  ["/commitment", "Commitment"],
  ["/paperhands-index", "Index"],
  ["/economy", "Economy"],
  ["/explorer", "Explorer"],
  ["/lab", "Lab"],
  ["/rules", "Rules"],
];

function Bar() {
  const path = usePathname();
  const wallet = useWallet();
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <PaperHand className="h-10 w-10" />
          <DiamondHand className="h-10 w-10" />
          <span className="text-lg tracking-wide">PAPERHANDS</span>
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm text-paper/80">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "text-cyan" : "hover:text-paper"}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-sm">
          {wallet.accountId ? (
            <button className="rounded-full border border-cyan/40 px-3 py-1" onClick={() => void wallet.disconnect()} type="button">
              {wallet.accountId}
            </button>
          ) : (
            <button className="rounded-full bg-violet px-3 py-1 text-paper" onClick={() => void wallet.connect()} type="button">
              {wallet.busy ? "Connecting" : "Connect Testnet"}
            </button>
          )}
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-3 text-xs text-paper/60">
        {MAINNET_REFUSED
          ? "Mainnet is refused by this MVP."
          : `Network ${NETWORK}. Contract ${CONTRACT_ID || "not connected"}. The faucet is not Sybil-proof.`}
      </p>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <Bar />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </WalletProvider>
  );
}
