import { useState } from "react";
import PillButton from "../components/PillButton";
import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import type { ElementSnapshot } from "../lib/inspect";
import { scoreAccessibility, type PartResult, type ScoreResult } from "../lib/score";
import DesignResult from "../components/DesignResult";
import AskBox from "../components/AskBox";
import { useAsk } from "../hooks/useAsk";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

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

/** One side of the Preview: a color swatch for every #hex in the text, then the text. */
function Tile({ label, text, site }: { label: string; text: string; site?: boolean }) {
  const hexes = text.match(/#[0-9a-fA-F]{6}/g) ?? [];
  return (
    <div
      className="force-light min-w-0 flex-1 rounded-xl px-3 py-2"
      style={{ background: site ? "#FFF8EE" : "#F6F3FF" }}
    >
      <div className="text-[11px] font-bold tracking-wide" style={{ color: site ? "#8A5200" : "#5A32C6" }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {hexes.map((h, i) => (
          <i
            key={i}
            className="h-3.5 w-3.5 flex-none rounded border border-black/10"
            style={{ background: h }}
          />
        ))}
        <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--ink2)]">{text || "—"}</span>
      </div>
    </div>
  );
}

/** Same look as "Changes to Prioritize": icon tile, title, one-line subtitle, Preview + Commit. */
function Findings({ parts, goalLabel }: { parts: PartResult[]; goalLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Local checklist only: nothing is written to code or GitHub.
  const toggleDone = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const rows = [...parts].filter((p) => rank(p) < 2).sort((a, b) => rank(a) - rank(b));
  const skipped = parts.filter((p) => rank(p) === 2).map((p) => p.name);
  const failing = rows.filter((p) => rank(p) === 0).length;

  return (
    <section className={card}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">
        {failing > 0 ? "Changes to Prioritize" : "All checks"}
      </h3>
      <ul className="scroll max-h-60 overflow-y-auto pr-2">
        {rows.map((p) => {
          const fix = rank(p) === 0;
          const ink = luma(p.color) > 0.6 ? "#3A1F78" : "#fff";
          const isOpen = open === p.id;
          const isDone = done.has(p.id);
          return (
            <li key={p.id} className="border-t border-[var(--line)] first:border-t-0">
              <div className="flex items-center gap-2.5 py-1.5">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
                  style={{ background: p.color }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <path d="M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z" fill={ink} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--ink)]">{p.name}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]" title={fix ? p.fix || p.note : p.note}>
                    {fix ? p.fix || p.note : p.note}
                  </p>
                </div>
                <PillButton
                  variant={isOpen ? "ghostOn" : "ghost"}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : p.id)}
                >
                  Preview
                </PillButton>
                {fix ? (
                  <PillButton
                    variant={isDone ? "soft" : "primary"}
                    onClick={() => toggleDone(p.id)}
                    className="sm:min-w-[84px]"
                  >
                    {isDone ? "Done ✓" : "Mark done"}
                  </PillButton>
                ) : (
                  <span className="rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-center text-xs font-semibold text-[var(--badge-text)] sm:min-w-[84px]">
                    Passing ✓
                  </span>
                )}
              </div>
              {isOpen && (
                <div className="flex gap-2 pb-2">
                  <Tile label={goalLabel} text={p.goal} />
                  <Tile label="YOUR SITE" text={p.site} site />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {skipped.length > 0 && (
        <p className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] text-[var(--muted)]">
          Not applicable to this element: {skipped.join(", ")}.
        </p>
      )}
    </section>
  );
}

interface Props {
  el: ElementSnapshot;
  tab: "design" | "accessibility";
  projectId: number | null; // connected Figma project (null = not connected yet)
  onGoFigma: () => void;
  onBack: () => void;
  onScored?: (score: number) => void;
}

export default function ElementScore({ el, tab, projectId, onGoFigma, onBack, onScored }: Props) {
  const isDesign = tab === "design";
  const result = isDesign ? null : scoreAccessibility(el);

  const ai = useAsk(() => ({
    kind: "accessibility check (computed locally from the element's styles and attributes)",
    element: { tag: el.tag, selector: el.selector, role: el.role, accessible_name: el.name, text: el.text },
    accessibility_score_percent: result?.total ?? null,
    checks: (result?.parts ?? []).map((p) => ({
      name: p.name,
      applies: p.fraction !== null,
      pass_percent: p.fraction === null ? null : Math.round(p.fraction * 100),
      note: p.note,
      suggested_fix: p.fix || null,
      site_now: p.site,
      goal: p.goal,
    })),
  }));

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer text-xs font-semibold text-[var(--p1)]"
      >
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

      {isDesign ? (
        projectId ? (
          <DesignResult projectId={projectId} element={el} onScored={onScored} />
        ) : (
          <section className={card}>
            <p className="text-xs font-semibold text-[var(--ink)]">No Figma frame selected yet</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Connect a Figma file and choose a frame, then select this element again to compare it.
            </p>
            <PillButton className="mt-2" onClick={onGoFigma}>
              Go to Figma Link
            </PillButton>
          </section>
        )
      ) : (
        result && (
          <>
            <ScoreBreakdown card={toCard("Accessibility Score", result, "Accessible")} />
            {result.checked === 0 && (
              <p className="px-1 text-[11px] text-[var(--muted)]">
                This element has no text, image or control to check, so only the page-level check ran.
                Select a button, link, image or piece of text to see a real score.
              </p>
            )}
            <Findings key={tab} parts={result.parts} goalLabel="GOAL" />
            <AskBox
              items={ai.items}
              busy={ai.busy}
              onAsk={(q) => void ai.ask(q)}
              explainQuestion="Explain these accessibility results in plain words: what is wrong, who it affects, and what to fix first?"
              placeholder="Ask about accessibility issues…"
            />
          </>
        )
      )}
    </div>
  );
}
