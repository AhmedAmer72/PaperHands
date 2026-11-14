import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { CONTRACT_ID } from "@/lib/config";
import { PRIMARY_LINKS } from "@/lib/nav";

const CARDS = [
  {
    title: "Stay current.",
    body: "The epoch, the rule, and what a lock actually does.",
    href: "/get-started",
    label: "Get started",
    image: "/assets/paperhands/illustrations/diamond.png",
    width: 775,
    height: 1024,
  },
  {
    title: "And your lock?",
    body: "Connect a testnet wallet and join the open epoch.",
    href: "/commitment",
    label: "Join this epoch",
    image: "/assets/paperhands/illustrations/handshake.png",
    width: 894,
    height: 847,
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer mx-auto mt-16 grid max-w-[1200px] gap-10 px-3 pb-2 md:mt-24 md:gap-14 md:px-5 lg:mt-32" id="site-footer">
      <div className="grid gap-6 min-[641px]:grid-cols-2">
        {CARDS.map((card) => (
          <article className="flex h-full flex-col gap-8 rounded-[3rem] bg-forest p-8 text-cream md:p-12 lg:gap-10 lg:p-14" key={card.href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="mx-auto h-32 w-auto object-contain md:h-40 lg:h-44" height={card.height} src={card.image} width={card.width} />
            <div className="flex flex-1 flex-col items-start gap-5">
              <p className="font-sans text-[2rem] font-semibold normal-case leading-none tracking-tight text-cream md:text-[2.45rem]">{card.title}</p>
              <p className="max-w-sm text-base leading-relaxed text-cream/90">{card.body}</p>
              <Link className="btn btn-pink mt-auto px-7 text-base" href={card.href}>{card.label}</Link>
            </div>
          </article>
        ))}
      </div>
      <nav aria-label="Footer" className="site-footer-nav grid justify-items-center gap-6 pt-2 md:pt-6">
        <ul className="flex flex-col items-center gap-3 text-base font-semibold min-[641px]:flex-row min-[641px]:gap-8 lg:gap-14">
          {PRIMARY_LINKS.map(([href, label]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
        <p className="text-sm">© 2026 PaperHands.</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <li>
            <a href="https://near.org" rel="noreferrer">NEAR Protocol</a>
          </li>
          {CONTRACT_ID ? (
            <li>
              <a href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`} rel="noreferrer">
                Contract
              </a>
            </li>
          ) : null}
        </ul>
      </nav>
      <div className="site-footer-logo">
        <Wordmark animated />
      </div>
    </footer>
  );
}
