"use client";

import { useEffect, useRef, useState } from "react";

const DOT_R = 4.75;
const DOT_Y = 4.92;
const GAP = 2;
const WORD = "PAPERHANDS";
const LETTER_DELAY = [640, 40, 820, 180, 520, 90, 760, 280, 480, 140];

type Glyph = {
  w: number;
  dot: number;
  paths: string[];
  stroke?: string;
};

const GLYPHS: Record<string, Glyph> = {
  P: {
    w: 22.35,
    dot: 11.15,
    paths: [
      "M0 14.13H11.55C18.55 14.13 22.35 19.05 22.35 27.85C22.35 36.85 18.85 41.9 12.05 41.9H9.13V60H0ZM9.2 23.15H10.35C14.15 23.15 14.85 25.35 14.85 28.05C14.85 31.15 14.15 33.55 10.15 33.55H9.2Z",
    ],
  },
  A: {
    w: 24.34,
    dot: 12.19,
    paths: [
      "M4.42 14.13H19.96L24.34 60H15.64L15 52.58H9.45L8.81 60H0L4.42 14.13ZM9.88 45.26L7.85 21.93H7.42L5.71 45.26Z",
    ],
  },
  E: {
    w: 18.7,
    dot: 8.7,
    paths: ["M0 14.13H18.7V23.05H9.13V32.25H18.7V41.15H9.13V51.1H18.7V60H0Z"],
  },
  R: {
    w: 25.6,
    dot: 11,
    paths: [
      "M0 14.13H11.2C18.1 14.13 21.8 18.5 21.8 26.3C21.8 34.1 18.3 38.2 12 38.2H9.13V60H0ZM9.2 22.7H10.5C14.1 22.7 14.8 24.5 14.8 26.5C14.8 29.1 14 31.1 10.3 31.1H9.2Z",
      "M11.2 37.8L20.2 37.8L25.6 60L16.2 60Z",
    ],
  },
  H: {
    w: 22.59,
    dot: 11.3,
    paths: ["M0 14.13H9.13V30.52H13.46V14.13H22.59V60H13.46V39.17H9.13V60H0Z"],
  },
  N: {
    w: 30.4,
    dot: 15.2,
    paths: ["M0 14.13H9.13L21.27 50V14.13H30.4V60H21.27L9.13 26V60H0Z"],
  },
  D: {
    w: 26.4,
    dot: 13.2,
    paths: [
      "M0 14.13H11.2C20.6 14.13 26.4 22.4 26.4 37.06C26.4 51.8 20.6 60 11.2 60H0ZM9.13 23.3H11C16.2 23.3 17.5 28.6 17.5 37.06C17.5 45.6 16.2 50.9 11 50.9H9.13Z",
    ],
  },
  S: {
    w: 25.4,
    dot: 12,
    paths: [],
    stroke:
      "M17.6 23.4C17.6 19.3 14.7 18.7 11.8 18.7C7.9 18.7 6 21.1 6 24.7C6 28.5 8.8 30.4 13.2 32.6C18.2 35.1 20.8 37.6 20.8 43C20.8 49 17.2 55.6 11.9 55.6C7.2 55.6 4.8 52.6 4.8 49.2",
  },
};

const PLACED = (() => {
  let x = 0;
  const items = WORD.split("").map((letter, index) => {
    const glyph = GLYPHS[letter];
    const item = { ...glyph, x, index };
    x += glyph.w + GAP;
    return item;
  });
  return { items, width: Math.round((x - GAP) * 100) / 100 };
})();

export function Wordmark({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const arm = () => {
      node.style.setProperty("--rise", `${Math.max(node.clientHeight, 1)}px`);
    };
    arm();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      arm();
      setInView(true);
      observer.disconnect();
    }, { threshold: 0.85 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [animated]);

  const classes = ["wordmark", animated ? "is-animated" : "", animated && inView ? "is-inview" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      aria-hidden
      className={classes}
      fill="currentColor"
      ref={ref}
      viewBox={`0 0 ${PLACED.width} 60.4`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {PLACED.items.map((glyph) => (
        <g key={glyph.index} transform={`translate(${glyph.x} 0)`}>
          {glyph.paths.map((d, pathIndex) => (
            <path
              className="wm-part wm-letter"
              d={d}
              fillRule="evenodd"
              key={pathIndex}
              style={{ animationDelay: `${LETTER_DELAY[glyph.index]}ms` }}
            />
          ))}
          {glyph.stroke ? (
            <path
              className="wm-part wm-letter"
              d={glyph.stroke}
              fill="none"
              stroke="currentColor"
              strokeLinecap="square"
              strokeLinejoin="round"
              strokeWidth={9.13}
              style={{ animationDelay: `${LETTER_DELAY[glyph.index]}ms` }}
            />
          ) : null}
          <circle
            className="wm-part wm-dot"
            cx={glyph.dot}
            cy={DOT_Y}
            r={DOT_R}
            style={{ animationDelay: `${LETTER_DELAY[glyph.index] + 1000}ms` }}
          />
        </g>
      ))}
    </svg>
  );
}
