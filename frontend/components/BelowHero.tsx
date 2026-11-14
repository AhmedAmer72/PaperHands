"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { EpochDetail } from "@/lib/chain";

const POP = [0.17, 0.67, 0.3, 1.1] as const;

const RULES = [
  {
    src: "/assets/paperhands/illustrations/bill.png",
    width: 765,
    title: "Lock 1,000 PAPER",
    body: "One amount. It sits in the contract until you claim or exit.",
  },
  {
    src: "/assets/paperhands/illustrations/diamond.png",
    width: 775,
    title: "Stay, or leave early",
    body: "Stay through the epoch, or exit early and take the reduced return.",
  },
  {
    src: "/assets/paperhands/illustrations/lock.png",
    width: 747,
    title: "Claim what you kept",
    body: "After finalize, claim your principal and any rewards the epoch minted.",
  },
];

export function BelowHero({
  hold,
  entry,
  clockReady,
  earlyReturn,
  listings,
  error,
  supply,
  faucet,
  burn,
}: {
  hold: string;
  entry: string;
  clockReady: boolean;
  earlyReturn: string;
  listings: EpochDetail[];
  error: string | null;
  supply: string;
  faucet: string;
  burn: string;
}) {
  const steps = [
    ["01", "Connect", "Connect a testnet account and register storage on the commitment page."],
    ["02", "Claim, then lock", "Claim the faucet once. Then lock 1,000 PAPER into the open epoch."],
    ["03", "Stay, or leave early", `Stay through the epoch, or exit early and receive ${earlyReturn}.`],
    ["04", "Finalize and claim", "Open the closed epoch from the index. Finalize, then claim."],
  ] as const;

  return (
    <>
      <Mission
        cards={RULES.map((rule, index) => ({
          ...rule,
          body: index === 1 ? `Stay through the epoch, or exit early and receive ${earlyReturn}.` : rule.body,
          flip: index % 2 === 1,
        }))}
        clockReady={clockReady}
        entry={entry}
        hold={hold}
      />

      <section className="parcours" id="path">
        <div className="parcours-sticky">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="parcours-hand" height={847} src="/assets/paperhands/illustrations/handshake.png" width={894} />
          <h2 className="display-md">A path, not a pile of pages.</h2>
          <Link className="btn btn-green mt-6" href="/get-started">Get started</Link>
        </div>
        <div className="parcours-steps">
          {steps.map(([n, title, body], index) => (
            <Reveal key={n} delay={index * 0.05}>
              <article className="path-step">
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-block" id="epochs">
        <Reveal>
          <h2 className="display-md max-w-3xl">Finalized epochs</h2>
        </Reveal>
        {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
        {listings.length === 0 ? (
          <p className="mt-6 max-w-xl text-ink/70">No finalized epoch is on the contract yet.</p>
        ) : (
          <div className="epoch-stack">
            {listings.map((item, index) => (
              <ScrollCard index={index} key={item.epoch_id}>
                <Link className="epoch-link" href={`/epoch/${item.epoch_id}`}>
                  <p className="font-display text-4xl leading-none">Epoch {item.epoch_id}</p>
                  <p className="mt-4 text-sm text-ink/70">
                    {item.retention_bps == null ? "Retention pending" : `${(item.retention_bps / 100).toFixed(2)}% stayed`}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">{item.active_participants} still in</p>
                  <p className="mt-1 text-sm text-ink/70">{item.early_exits} left early</p>
                </Link>
              </ScrollCard>
            ))}
          </div>
        )}
        <div className="reserve-rail" aria-label="Reserves">
          <Reserve tone="forest" label="Supply" value={supply} />
          <Reserve tone="pink" label="Faucet reserve" value={faucet} />
          <Reserve tone="ink" label="Burn reserve" value={burn} />
        </div>
      </section>

      <section className="home-block" id="questions">
        <Reveal>
          <h2 className="display-md">Questions, answered short.</h2>
        </Reveal>
        <div className="faq-list">
          <Faq q="What does a join lock?" a="1,000 PAPER, for that epoch. It stays in the contract until you claim or exit." />
          <Faq q="What does an early exit return?" a={`${earlyReturn}. The rest is the early-exit penalty. It is not a reward.`} />
          <Faq q="Is a sponsor campaign the same lock?" a="No. A campaign locks another 1,000 PAPER in the sponsor contract. It does not count as an epoch commitment." />
        </div>
      </section>

      <section className="home-block" id="roles">
        <Reveal>
          <h2 className="display-md">Three roles. No extra ones.</h2>
        </Reveal>
        <div className="role-rail">
          <Role href="/commitment" name="Participant" line="Lock 1,000 PAPER and stay, or leave early." />
          <Role href="/sponsors" name="Sponsor" line="Open a campaign. It is a separate 1,000 PAPER lock." />
          <Role href="/treasury" name="Treasury" line="Vote on a proposal. The vote is the action." />
        </div>
      </section>
    </>
  );
}

function Mission({
  clockReady,
  hold,
  entry,
  cards,
}: {
  clockReady: boolean;
  hold: string;
  entry: string;
  cards: { src: string; width: number; title: string; body: string; flip: boolean }[];
}) {
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const kicker = clockReady ? `${hold} to hold. ${entry} to enter.` : "The clock is on the contract.";
  return (
    <section className="mission" id="rules">
      <motion.p
        className="mission-kicker"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.45, ease: POP }}
      >
        {kicker}
      </motion.p>
      <h2 className="mission-title display-md">
        <motion.span
          className="mission-line"
          initial={reduce ? false : { opacity: 0, y: 28, rotate: 2 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.55, ease: POP }}
        >
          Beyond a simple hold :
        </motion.span>
        <motion.span
          className="mission-line"
          initial={reduce ? false : { opacity: 0, y: 28, rotate: -1.5 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          onViewportEnter={() => setDrawn(true)}
          transition={{ duration: 0.55, delay: 0.08, ease: POP }}
        >
          <span className={drawn || reduce ? "marker drawn" : "marker"}>The rule</span>
        </motion.span>
      </h2>
      <div className="mission-stack">
        {cards.map((card, index) => (
          <MissionCard card={card} index={index} key={card.title} />
        ))}
      </div>
    </section>
  );
}

function MissionCard({
  card,
  index,
}: {
  card: { src: string; width: number; title: string; body: string; flip: boolean };
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lift = index % 2 === 1 ? [64, 0, -40] : [48, 0, 22];
  const tilt = index % 2 === 1 ? [2.2, 0, -1.1] : [-1.4, 0, 0.7];
  const y = useTransform(scrollYProgress, [0, 0.32, 1], lift);
  const rotate = useTransform(scrollYProgress, [0, 0.32, 1], tilt);
  return (
    <motion.article
      ref={ref}
      className={`mission-card shift-${index} ${card.flip ? "flip" : ""}`}
      style={reduce ? undefined : { y, rotate }}
    >
      <div>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" height={1024} src={card.src} width={card.width} />
    </motion.article>
  );
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 56, rotate: 2.2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, delay, ease: POP }}
    >
      {children}
    </motion.div>
  );
}

function ScrollCard({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const tilt = index % 3 === 1 ? [-2.4, 0.4, 1.6] : index % 3 === 2 ? [2.2, -0.3, -1.5] : [1.1, 0, -0.8];
  const y = useTransform(scrollYProgress, [0, 0.4, 1], [72, 0, -28]);
  const rotate = useTransform(scrollYProgress, [0, 0.4, 1], tilt);
  return (
    <motion.div ref={ref} className={`epoch-card shift-${index % 3}`} style={reduce ? undefined : { y, rotate }}>
      {children}
    </motion.div>
  );
}

function Reserve({ tone, label, value }: { tone: "forest" | "pink" | "ink"; label: string; value: string }) {
  return (
    <motion.article
      className={`reserve-slide tone-${tone}`}
      initial={{ opacity: 0.45, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ amount: 0.7 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <p>{label}</p>
      <p>{value}</p>
    </motion.article>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="faq-item">
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">
        <span>{q}</span>
        <motion.span aria-hidden className="faq-chevron" animate={{ rotate: open ? 90 : 0 }} transition={{ duration: reduce ? 0 : 0.15 }}>
          <svg viewBox="0 0 10 16" width="10" height="16">
            <path d="M2 1.5 L8 8 L2 14.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
        </motion.span>
      </button>
      <motion.div
        className="faq-panel"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <p>{a}</p>
      </motion.div>
    </div>
  );
}

function Role({ href, name, line }: { href: string; name: string; line: string }) {
  return (
    <motion.div className="role-slide" initial={{ opacity: 0.5, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ amount: 0.7 }} transition={{ duration: 0.35 }}>
      <Link href={href}>
        <strong>{name}</strong>
        <span>{line}</span>
      </Link>
    </motion.div>
  );
}
