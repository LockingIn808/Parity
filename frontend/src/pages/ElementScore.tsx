import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import type { ElementSnapshot } from "../lib/inspect";
import { scoreAccessibility, scoreDesign, type PartResult, type ScoreResult } from "../lib/score";
import { specFor } from "../lib/spec";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";
const chip = "rounded-full px-2 py-[3px] text-[11px] font-bold";

const toCard = (title: string, r: ScoreResult, good: string): CardData => ({
  title,
  slices: r.slices,
  total: r.total,
  totalLabel: good,
  remainderLabel: "To go",
});

function Findings({ title, parts }: { title: string; parts: PartResult[] }) {
  return (
    <section className={card}>
      <h3 className="m-0 mb-0.5 text-sm font-extrabold">{title}</h3>
      <ul className="list-none">
        {parts.map((p) => {
          const f = p.fraction;
          const na = f === null;
          const ok = f !== null && f >= 1;
          return (
            <li key={p.id} className="flex items-start gap-3 border-t border-[var(--line)] py-2">
              <i className="mt-1 h-2.5 w-2.5 flex-none rounded-sm" style={{ background: p.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{p.name}</p>
                <p className="text-[11px] text-[var(--muted)]">{p.note}</p>
                {!ok && !na && p.fix && (
                  <p className="mt-0.5 text-[11px] font-semibold text-[var(--p1)]">Fix: {p.fix}</p>
                )}
              </div>
              <span
                className={`${chip} ${
                  na
                    ? "bg-[var(--card-soft)] text-[var(--muted)]"
                    : ok
                      ? "bg-[var(--badge-bg)] text-[var(--badge-text)]"
                      : "bg-[#FFF1DC] text-[#8A5200]"
                }`}
              >
                {na ? "N/A" : ok ? "Pass" : "Fix"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface Props {
  el: ElementSnapshot;
  onBack: () => void;
}

export default function ElementScore({ el, onBack }: Props) {
  const design = scoreDesign(el, specFor(el));
  const a11y = scoreAccessibility(el);

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

      <ScoreBreakdown card={toCard("Design Comparison", design, "Similar")} />
      <Findings title="Design differences" parts={design.parts} />

      <ScoreBreakdown card={toCard("Accessibility Score", a11y, "Accessible")} />
      <Findings title="Accessibility checks" parts={a11y.parts} />

      <p className="px-1 text-[11px] text-[var(--muted)]">
        The design score compares against sample Figma values until your Figma file data is connected.
      </p>
    </div>
  );
}