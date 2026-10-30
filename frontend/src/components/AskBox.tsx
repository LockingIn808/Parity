import { useEffect, useRef, useState } from "react";
import type { QA } from "../hooks/useAsk";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

interface Props {
  items: QA[];
  busy: boolean;
  onAsk: (question: string) => void;
  explainQuestion: string; // what the "Explain" button asks
  placeholder: string;
}

/** "✦ Explain" plus a small chat box about the element on screen. */
export default function AskBox({ items, busy, onAsk, explainQuestion, placeholder }: Props) {
  const [value, setValue] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [items]);

  const send = () => {
    const question = value.trim();
    if (!question || busy) return;
    setValue("");
    onAsk(question);
  };

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ink)]">✦ Ask Parity</h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAsk(explainQuestion)}
          className="cursor-pointer rounded-full bg-[var(--card-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--p1)] disabled:opacity-60"
        >
          Explain these results
        </button>
      </div>

      {items.length > 0 && (
        <div className="scroll mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="text-[11px]">
              <p className="font-semibold text-[var(--ink)]">{item.question}</p>
              {item.answer ? (
                <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-[var(--ink2)]">{item.answer}</p>
              ) : item.error ? (
                <p role="alert" className="mt-0.5 text-[var(--err)]">{item.error}</p>
              ) : (
                <p className="mt-0.5 text-[var(--muted)]">Thinking…</p>
              )}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 rounded-full border-[1.5px] border-[var(--field-border)] bg-[var(--field)] py-1 pl-3 pr-1 focus-within:border-[var(--p1)]">
        <input
          type="text"
          value={value}
          maxLength={500}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-xs text-[var(--ink)] outline-none"
        />
        <button
          type="button"
          aria-label="Send question"
          disabled={busy || !value.trim()}
          onClick={send}
          className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] text-xs text-white disabled:opacity-50"
        >
          ➜
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--muted)]">
        AI answers use only the results shown here and can be wrong. Check before changing code.
      </p>
    </section>
  );
}
