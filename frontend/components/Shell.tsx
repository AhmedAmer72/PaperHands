"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTRACT_ID, MAINNET_REFUSED, MISSION_CONTRACT_ID, NETWORK, SPONSOR_CONTRACT_ID, TREASURY_CONTRACT_ID } from "@/lib/config";
import { WalletProvider, useWallet } from "@/lib/wallet";

const PRIMARY = [
  ["/commitment", "Commit"],
  ["/paperhands-index", "Epochs"],
  ["/sponsors", "Sponsors"],
  ["/missions", "Missions"],
  ["/treasury", "Treasury"],
];

function current(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function NavLink({ href, label, path, onNavigate }: { href: string; label: string; path: string; onNavigate?: () => void }) {
  const on = current(path, href);
  return (
    <Link
      aria-current={on ? "page" : undefined}
      className={`rounded-full px-3 py-2 ${on ? "bg-pink text-ink" : "text-cream/90 hover:bg-white/10 hover:text-cream"}`}
      href={href}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

function Bar() {
  const path = usePathname();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="sticky top-0 z-30 px-3 pt-3 md:px-5">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 rounded-[2rem] bg-forest px-3 py-2 text-cream shadow-[0_12px_40px_#09543d33] md:px-4">
          <Link aria-label="PaperHands home" className="flex min-h-11 items-center gap-2 rounded-full pr-2" href="/" onClick={() => setOpen(false)}>
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-pink text-xs font-semibold text-ink">PH</span>
            <span className="font-display text-xl tracking-wide">PAPERHANDS</span>
          </Link>
          <nav aria-label="Primary" className="ml-1 hidden items-center gap-1 text-sm lg:flex">
            {PRIMARY.map(([href, label]) => (
              <NavLink href={href} key={href} label={label} path={path} />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {wallet.accountId ? (
              <>
                <Link className="btn btn-cream hidden max-w-[12rem] truncate px-3 text-xs sm:inline-flex" href={`/profile/${wallet.accountId}`}>
                  Your profile
                </Link>
                <button className="btn btn-cream px-3 text-xs" onClick={() => void wallet.disconnect()} type="button">
                  Disconnect
                </button>
              </>
            ) : (
              <button className="btn btn-pink px-3 text-xs" disabled={wallet.busy} onClick={() => void wallet.connect()} type="button">
                {wallet.busy ? "Connecting…" : "Connect Testnet"}
              </button>
            )}
            <button
              aria-controls="site-menu"
              aria-expanded={open}
              className="btn btn-cream px-3 text-xs lg:hidden"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
        {open ? (
          <nav aria-label="Site" className="mx-auto mt-2 grid max-w-[1200px] gap-1 rounded-[1.5rem] bg-forest p-4 text-cream lg:hidden" id="site-menu">
            {PRIMARY.map(([href, label]) => (
              <NavLink href={href} key={href} label={label} onNavigate={() => setOpen(false)} path={path} />
            ))}
            {wallet.accountId ? (
              <NavLink href={`/profile/${wallet.accountId}`} label="Your profile" onNavigate={() => setOpen(false)} path={path} />
            ) : null}
          </nav>
        ) : null}
      </header>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 text-xs text-ink/70">
        <p>
          {MAINNET_REFUSED ? "Mainnet is refused by this build." : `Network ${NETWORK}.`}
        </p>
        {wallet.accountId ? <p className="max-w-full truncate" translate="no">{wallet.accountId}</p> : <p>Wallet not connected.</p>}
        <details className="min-w-0">
          <summary className="cursor-pointer font-semibold text-forest">Contract addresses</summary>
          <ul className="mt-1 space-y-1 break-all">
            <li translate="no">Core {CONTRACT_ID || "not connected"}</li>
            <li translate="no">Sponsor {SPONSOR_CONTRACT_ID}</li>
            <li translate="no">Missions {MISSION_CONTRACT_ID}</li>
            <li translate="no">Treasury {TREASURY_CONTRACT_ID}</li>
          </ul>
        </details>
        {wallet.error ? <p role="alert">{wallet.error}</p> : null}
      </div>
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <Bar />
      <main className={path === "/" ? "" : "mx-auto max-w-[1100px] px-5 py-8"} id="main" tabIndex={-1}>{children}</main>
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
