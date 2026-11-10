"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CONTRACT_ID, MAINNET_REFUSED, NETWORK } from "@/lib/config";
import { WalletProvider, useWallet } from "@/lib/wallet";

const LINKS = [
  ["/", "Home"],
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
  const [open, setOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-30 px-3 pt-3 md:px-5">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 rounded-full bg-forest px-3 py-2 text-cream shadow-[0_12px_40px_#09543d33] md:px-5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-pink text-xs font-semibold text-ink" aria-hidden>
            PH
          </span>
          <span className="font-display text-xl tracking-wide">PAPERHANDS</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-4 text-sm lg:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "text-pink" : "text-cream/85 hover:text-cream"}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {wallet.accountId ? (
            <button className="btn btn-cream max-w-[14rem] truncate px-3 py-2 text-xs" onClick={() => void wallet.disconnect()} type="button">
              {wallet.accountId}
            </button>
          ) : (
            <button className="btn btn-pink px-3 py-2 text-xs" onClick={() => void wallet.connect()} type="button">
              {wallet.busy ? "Connecting" : "Connect Testnet"}
            </button>
          )}
          <button className="btn btn-cream px-3 py-2 text-xs lg:hidden" onClick={() => setOpen((value) => !value)} type="button">
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="mx-auto mt-2 grid max-w-[1200px] gap-1 rounded-[1.5rem] bg-forest p-4 text-cream lg:hidden">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-3 py-2 hover:bg-white/10" onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
    <p className="mx-auto max-w-[1200px] px-5 pt-3 text-xs text-ink/70">
      {MAINNET_REFUSED
        ? "Mainnet is refused by this MVP."
        : `Network ${NETWORK}. Contract ${CONTRACT_ID || "not connected"}. The faucet is not Sybil-proof.`}
      {wallet.error ? ` ${wallet.error}` : ""}
    </p>
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <Bar />
      <main className={path === "/" ? "" : "mx-auto max-w-[1100px] px-5 py-8"}>{children}</main>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <Frame>{children}</Frame>
    </WalletProvider>
  );
}
