import { useCallback, useEffect, useRef, useState } from "react";
import PillButton from "../components/PillButton";
import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import AskBox from "../components/AskBox";
import { ActionLinks } from "../components/LiveBits";
import { collectById, type ElementSnapshot } from "../lib/inspect";
import { evalInPage, inDevtools } from "../lib/devtools";
import { finish, scoreAccessibility, type PartResult, type ScoreResult } from "../lib/score";
import { compareElement, type CompareResult } from "../lib/api";
import { cssRule, designElementParts, fixesForPart } from "../lib/reports";
import { useAsk } from "../hooks/useAsk";
import type { LiveDesign } from "../hooks/useLiveDesign";
import type { LiveActions } from "../types/design";

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

/**
 * Same look as "Changes to Prioritize": icon tile, title, one-line subtitle, Preview + Commit.
 * With `live` for a part, Preview also shows the change on the page and Commit saves it to GitHub
 * (then reads Revert). Without it, Commit is the original local checkmark.
 */
function Findings({
  parts,
  goalLabel,
  live,
}: {
  parts: PartResult[];
  goalLabel: string;
  live?: Record<string, LiveActions>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Leaving the view takes an open preview off the page.
  const openRef = useRef({ open, live });
  openRef.current = { open, live };
  useEffect(
    () => () => {
      const { open: id, live: actions } = openRef.current;
      if (id) actions?.[id]?.preview?.(false);
    },
    []
  );

  const toggleDone = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const togglePreview = (id: string) => {
    if (open) live?.[open]?.preview?.(false);
    const next = open === id ? null : id;
    if (next) live?.[next]?.preview?.(true);
    setOpen(next);
  };

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
          const actions = live?.[p.id];
          const real = Boolean(actions?.commit);
          const isDone = real ? Boolean(actions?.committed) : done.has(p.id);
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
                  onClick={() => togglePreview(p.id)}
                >
                  Preview
                </PillButton>
                {fix ? (
                  <PillButton
                    variant={isDone ? "soft" : "primary"}
                    disabled={actions?.busy}
                    onClick={() =>
                      real ? (isDone ? actions?.revert?.() : actions?.commit?.()) : toggleDone(p.id)
                    }
                    className="sm:min-w-[84px]"
                  >
                    {isDone ? (real ? "Revert" : "Committed ✓") : "Commit"}
                  </PillButton>
                ) : (
                  <span className="rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-center text-xs font-semibold text-[var(--badge-text)] sm:min-w-[84px]">
                    Passing ✓
                  </span>
                )}
              </div>
              {isOpen && (
                <>
                  <div className="flex gap-2 pb-2">
                    <Tile label={goalLabel} text={p.goal} />
                    <Tile label="YOUR SITE" text={p.site} site />
                  </div>
                  {actions && <ActionLinks live={actions} />}
                </>
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

/** Design tab for one element: compared with its matching Figma layer by the backend. */
function DesignElement({
  el,
  projectId,
  live,
  onScored,
  onLayer,
}: {
  el: ElementSnapshot;
  projectId: number;
  live: LiveDesign;
  onScored?: (score: number) => void;
  onLayer: (name: string) => void;
}) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null); // pinned after the first match

  const ai = useAsk(() => ({
    kind: "design comparison against Figma",
    element: { tag: el.tag, selector: el.selector, text: el.text },
    figma_layer: result ? `${result.matched_node.name} (${result.matched_node.type})` : null,
    frame: result?.project.frame_name ?? null,
    design_score_percent: result?.design_score ?? null,
    categories: (result?.categories ?? []).map((c) => ({
      name: c.name,
      match_percent: c.fraction === null ? null : Math.round(c.fraction * 100),
      site: c.current,
      figma: c.expected,
    })),
    differences: (result?.suggested_fixes ?? []).map((f) => ({ property: f.css_property, site: f.current, figma: f.expected })),
  }));

  const compare = useCallback(
    async (snap: ElementSnapshot, pinned: string | null) => {
      try {
        const next = await compareElement(projectId, snap, pinned);
        setResult(next);
        setError(null);
        setNodeId(next.matched_node.id);
        onLayer(next.matched_node.name || next.matched_node.id);
        onScored?.(next.design_score);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The comparison failed.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId]
  );

  useEffect(() => {
    void compare(el, null);
  }, [compare, el]);

  // After a preview changes the element, read it again so the score reflects what's on screen.
  const rescore = async () => {
    if (!inDevtools()) return;
    const fresh = await evalInPage<ElementSnapshot | null>(collectById(el.parityId)).catch(() => null);
    if (fresh) await compare(fresh, nodeId);
  };

  if (error && !result) {
    return (
      <section className={card}>
        <p role="alert" className="text-xs font-semibold text-[var(--err)]">
          {error}
        </p>
        <PillButton className="mt-2" onClick={() => void compare(el, nodeId)}>
          Try again
        </PillButton>
      </section>
    );
  }

  if (!result) {
    return (
      <section className={card}>
        <p className="text-xs text-[var(--muted)]">Comparing this element with your Figma design…</p>
      </section>
    );
  }

  const parts = designElementParts(result);
  const actions: Record<string, LiveActions> = {};
  for (const part of parts) {
    const { refs, fixes } = fixesForPart(result, el.selector, part.id);
    if (refs.length === 0) continue;
    actions[part.id] = {
      committed: live.isCommitted(refs),
      busy: live.busy,
      preview: (on) => void live.preview(el.parityId, refs, on).then(rescore),
      commit: () => live.commit(refs),
      revert: () => live.revert(refs),
      why: () =>
        void ai.ask(
          `Explain the ${part.name.toLowerCase()} differences (${part.fix}) and whether they are safe to change.`
        ),
      css: cssRule(el.selector, refs),
      tailwind: fixes.flatMap((f) => f.tailwind ?? []).join(" ") || undefined,
    };
  }

  return (
    <>
      <ScoreBreakdown card={toCard("Design Score", finish(parts), "Similar")} />
      <Findings parts={parts} goalLabel="FIGMA" live={actions} />
      <AskBox items={ai.items} busy={ai.busy} onAsk={(q) => void ai.ask(q)} placeholder="Ask about design differences..." />
    </>
  );
}

function AccessibilityElement({ el }: { el: ElementSnapshot }) {
  const result = scoreAccessibility(el);
  const ai = useAsk(() => ({
    kind: "accessibility check",
    element: { tag: el.tag, selector: el.selector, role: el.role, accessible_name: el.name, text: el.text },
    accessibility_score_percent: result.total,
    checks: result.parts.map((p) => ({
      name: p.name,
      pass_percent: p.fraction === null ? null : Math.round(p.fraction * 100),
      note: p.note,
      fix: p.fix || null,
      site: p.site,
      goal: p.goal,
    })),
  }));

  return (
    <>
      <ScoreBreakdown card={toCard("Accessibility Score", result, "Accessible")} />
      {result.checked === 0 && (
        <p className="px-1 text-[11px] text-[var(--muted)]">
          This element has no text, image or control to check, so only the page-level check ran.
          Select a button, link, image or piece of text to see a real score.
        </p>
      )}
      <Findings parts={result.parts} goalLabel="GOAL" />
      <AskBox items={ai.items} busy={ai.busy} onAsk={(q) => void ai.ask(q)} placeholder="Ask about accessibility issues..." />
    </>
  );
}

interface Props {
  el: ElementSnapshot;
  tab: "design" | "accessibility";
  projectId: number | null; // connected Figma project (null = not connected yet)
  live: LiveDesign;
  onGoFigma: () => void;
  onBack: () => void;
  onScored?: (score: number) => void;
}

export default function ElementScore({ el, tab, projectId, live, onGoFigma, onBack, onScored }: Props) {
  const isDesign = tab === "design";
  const [layer, setLayer] = useState<string | null>(null);

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

          {isDesign && layer && (
            <span
              className="max-w-[45%] flex-none truncate rounded-full bg-[#FFF1DC] px-2 py-[2px] text-[10px] font-bold text-[#8A5200]"
              title={`Compared with the Figma layer “${layer}”`}
            >
              Figma: {layer}
            </span>
          )}
        </div>
      </section>

      {isDesign ? (
        projectId ? (
          <DesignElement el={el} projectId={projectId} live={live} onScored={onScored} onLayer={setLayer} />
        ) : (
          <section className={card}>
            <p className="text-xs font-semibold text-[var(--ink)]">Connect a Figma design first</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Paste your Figma link and choose a frame, then select this element again.
            </p>
            <PillButton className="mt-2" onClick={onGoFigma}>
              Go to Figma Link
            </PillButton>
          </section>
        )
      ) : (
        <AccessibilityElement el={el} />
      )}
    </div>
  );
}
