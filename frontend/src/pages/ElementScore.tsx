import { useState } from "react";
import PillButton from "../components/PillButton";
import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import type { ElementSnapshot } from "../lib/inspect";
import { scoreAccessibility, scoreDesign, type PartResult, type ScoreResult } from "../lib/score";
import { specFor } from "../lib/spec";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";
const chip = "flex-none rounded-full px-2 py-[2px] text-[10px] font-bold";

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const toCard = (title: string, r: ScoreResult, good: string): CardData => ({
  title,
  slices: r.slices,
  total: r.total,
  totalLabel: good,
  remainderLabel: "To go",
});

// 0 = needs a fix, 1 = passes, 2 = does not apply
const rank = (p: PartResult) => (p.fraction === null ? 2 : p.fraction >= 1 ? 1 : 0);

/** Same look as "Changes to Prioritize": icon tile, title, one-line subtitle, small button. */
function Findings({ parts }: { parts: PartResult[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = [...parts].sort((a, b) => rank(a) - rank(b));
  const failing = rows.filter((p) => rank(p) === 0).length;

  return (
    <section className={card}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">
        {failing > 0 ? "Changes to Prioritize" : "All checks"}
      </h3>
      <ul className="scroll max-h-52 overflow-y-auto pr-2">
        {rows.map((p) => {
          const r = rank(p);
          const ink = luma(p.color) > 0.6 ? "#3A1F78" : "#fff";
          const isOpen = open === p.id;
          return (
            <li key={p.id} className="border-t border-[var(--line)] first:border-t-0">
              <div className="flex items-center gap-2.5 py-1.5">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
                  style={{ background: p.color, opacity: r === 2 ? 0.45 : 1 }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <path d="M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z" fill={ink} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--ink)]">{p.name}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]" title={r === 0 ? p.fix || p.note : p.note}>
                    {r === 0 ? p.fix || p.note : p.note}
                  </p>
                </div>
                {r === 0 ? (
                  <PillButton
                    variant={isOpen ? "ghostOn" : "ghost"}
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : p.id)}
                  >
                    Details
                  </PillButton>
                ) : r === 1 ? (
                  <span className={`${chip} bg-[var(--badge-bg)] text-[var(--badge-text)]`}>Pass ✓</span>
                ) : (
                  <span className={`${chip} bg-[var(--card-soft)] text-[var(--muted)]`}>N/A</span>
                )}
              </div>
              {isOpen && <p className="pb-2 pl-[34px] text-[11px] text-[var(--muted)]">{p.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface Props {
  el: ElementSnapshot;
  tab: "design" | "accessibility";
  onBack: () => void;
}

export default function ElementScore({ el, tab, onBack }: Props) {
  const result = tab === "design" ? scoreDesign(el, specFor(el)) : scoreAccessibility(el);

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="cursor-pointer text-xs font-semibold text-[var(--p1)]">
        &#8249; Back
      </button>

      <section className={card}>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-[var(--card-tint)] px-2 py-1 font-mono text-[11px] font-bold text-[var(--p1)]">
            &lt;{el.tag}&gt;
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{el.selector}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">{el.text || el.name || "No text"}</p>
          </div>
        </div>
      </section>

      <ScoreBreakdown
        card={
          tab === "design"
            ? toCard("Design Comparison", result, "Similar")
            : toCard("Accessibility Score", result, "Accessible")
        }
      />
      <Findings key={tab} parts={result.parts} />

      {tab === "design" && (
        <p className="px-1 text-[11px] text-[var(--muted)]">
          The design score compares against sample Figma values until your Figma file data is connected.
        </p>
      )}
    </div>
  );
}