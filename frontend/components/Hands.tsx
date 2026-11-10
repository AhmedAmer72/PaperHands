export function PaperHand({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="8" fill="#232228" />
      <path d="M18 40c0-10 6-16 14-16 4 0 6 2 8 2s4-2 8-2c2 0 4 2 4 6v8c0 8-6 14-16 14H28c-6 0-10-4-10-12z" fill="#f3efe4" />
      <path d="M24 24V14M32 22V12M40 24V16" stroke="#ff7a2f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function DiamondHand({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="8" fill="#232228" />
      <path d="M32 10l16 14-16 30L16 24z" fill="#2ee6d6" />
      <path d="M16 24h32M32 10v40M22 24l10 30 10-30" stroke="#16161a" strokeWidth="2" fill="none" />
    </svg>
  );
}
