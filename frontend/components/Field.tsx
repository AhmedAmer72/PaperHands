"use client";

import { useEffect, useId, useRef } from "react";

export function Field({
  label,
  value,
  onChange,
  error,
  hint,
  name,
  type = "text",
  inputMode,
  autoComplete = "off",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  name?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "url";
  autoComplete?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <label className="grid gap-1 text-sm" htmlFor={id}>
      {label}
      <input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className="control"
        id={id}
        inputMode={inputMode}
        name={name}
        spellCheck={false}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="text-ink/60" id={hintId}>{hint}</span> : null}
      {error ? <span className="text-orange" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <p className="rounded-2xl bg-orange/10 px-3 py-2 text-sm text-orange" ref={ref} role="alert" tabIndex={-1}>
      {message}
    </p>
  );
}
