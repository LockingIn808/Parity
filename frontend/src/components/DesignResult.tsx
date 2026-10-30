import { useCallback, useEffect, useRef, useState } from "react";
import PillButton from "./PillButton";
import ScoreBreakdown, { type CardData } from "./ScoreBreakdown";
import {
  compareElement,
  listFigmaLayers,
  type CompareResult,
  type FigmaLayer,
  type SuggestedFix,
} from "../lib/api";
import { collectById, type ElementSnapshot } from "../lib/inspect";
import { evalInPage, inDevtools } from "../lib/devtools";
import { applyStyles, revertStyles } from "../lib/preview";
import { copyText } from "../lib/clipboard";
import { useAsk } from "../hooks/useAsk";
import AskBox from "./AskBox";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";
const COLORS: Record<string, string> = {
  fonts: "#7C5CE8",
  color: "#9D86F2",
  spacing: "#B7A3F5",
  sizing: "#EFB87A",
};

const LABELS: Record<string, string> = {
  fontFamily: "Font family",
  fontSize: "Font size",
  fontWeight: "Font weight",
  color: "Text color",
  background: "Background",
  padding: "Padding",
  gap: "Gap",
  width: "Width",
  height: "Height",
  borderRadius: "Border radius",
};

interface Props {
  projectId: number;
  element: ElementSnapshot;
  onScored?: (score: number) => void;
}

/** The score card for the Design tab, built only from comparable categories. */
function toCard(result: CompareResult): CardData {
  const live = result.categories.filter((c) => c.fraction !== null);
  const totalWeight = live.reduce((sum, c) => sum + c.weight, 0) || 1;
  return {
    title: "Design Fidelity",
    slices: live.map((c) => ({
      id: c.id,
      name: c.name,
      color: COLORS[c.id] ?? "#B7A3F5",
      value: Math.round((((c.fraction ?? 0) * c.weight) / totalWeight) * 100),
    })),
    total: result.design_score,
    totalLabel: "Matches Figma",
    remainderLabel: "Still different",
  };
}

function Swatches({ text }: { text: string }) {
  const hexes = text.match(/#[0-9a-fA-F]{6}/g) ?? [];
  return (
    <>
      {hexes.map((h, i) => (
        <i
          key={i}
          className="mr-1 inline-block h-3 w-3 flex-none rounded border border-black/10 align-middle"
          style={{ background: h }}
        />
      ))}
    </>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--ink)]">{label}</span>
        <PillButton
          variant="ghost"
          disabled={!code}
          onClick={async () => {
            setCopied((await copyText(code)) ? "ok" : "fail");
            setTimeout(() => setCopied(null), 1500);
          }}
        >
          {copied === "ok" ? "Copied ✓" : copied === "fail" ? "Copy failed" : "Copy"}
        </PillButton>
      </div>
      <pre className="scroll max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--field)] p-2 font-mono text-[11px] text-[var(--ink)]">
        {code || "Nothing to change."}
      </pre>
    </div>
  );
}

export default function DesignResult({ projectId, element, onScored }: Props) {
  const [snapshot, setSnapshot] = useState(element);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Once a layer is matched it is pinned, so applying a fix can't make auto-matching jump to another layer.
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [layers, setLayers] = useState<FigmaLayer[] | null>(null);
  const [layersError, setLayersError] = useState<string | null>(null);
  // Fixes currently previewed on the page, keyed by CSS property.
  const [applied, setApplied] = useState<Record<string, SuggestedFix>>({});
  const [busy, setBusy] = useState(false);
  const [codeMode, setCodeMode] = useState<"fixes" | "all">("fixes");
  const scored = useRef(onScored);
  scored.current = onScored;

  const canPreview = inDevtools() && snapshot.parityId !== "sample";

  // Everything the AI may use: exactly what this panel shows, nothing else.
  const ai = useAsk(() => {
    if (!result) return { kind: "design", status: "no comparison yet" };
    const pendingNow = result.suggested_fixes.filter((f) => !applied[f.css_property]);
    return {
      kind: "design comparison against Figma",
      element: { tag: snapshot.tag, selector: snapshot.selector, text: snapshot.text },
      figma: {
        file: result.project.file_name,
        frame: result.project.frame_name,
        layer: `${result.matched_node.name} (${result.matched_node.type})`,
        text_layer: result.text_node?.name ?? null,
        matched_by: manual ? "user" : "automatic matching",
      },
      fidelity_score_percent: result.design_score,
      categories: result.categories.map((c) => ({
        name: c.name,
        comparable: c.fraction !== null,
        match_percent: c.fraction === null ? null : Math.round(c.fraction * 100),
        current: c.current,
        figma: c.expected,
      })),
      differences_still_open: pendingNow.map((f) => ({ property: f.css_property, current: f.current, figma: f.expected })),
      previewing_on_page: Object.values(applied).map((f) => ({ property: f.css_property, figma_value: f.expected })),
    };
  });

  const compare = useCallback(
    async (snap: ElementSnapshot, pinned: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const next = await compareElement(projectId, snap, pinned);
        setResult(next);
        setNodeId(next.matched_node.id);
        scored.current?.(next.design_score);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The comparison failed.");
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    void compare(element, null);
  }, [compare, element]);

  /** Re-reads the element from the page (after a preview changed it) and compares again. */
  const refresh = async (pinned = nodeId) => {
    let snap = snapshot;
    if (canPreview) {
      const fresh = await evalInPage<ElementSnapshot | null>(collectById(snapshot.parityId));
      if (!fresh) throw new Error("The element is no longer on the page. Select it again.");
      snap = fresh;
      setSnapshot(fresh);
    }
    await compare(snap, pinned);
  };

  const guarded = async (work: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  };

  const apply = (fixes: SuggestedFix[]) =>
    guarded(async () => {
      await applyStyles(
        snapshot.parityId,
        fixes.map((f) => ({ property: f.css_property, value: f.expected }))
      );
      setApplied((prev) => {
        const next = { ...prev };
        for (const f of fixes) next[f.css_property] = prev[f.css_property] ?? f;
        return next;
      });
      await refresh();
    });

  const revert = (properties: string[]) =>
    guarded(async () => {
      await revertStyles(snapshot.parityId, properties);
      setApplied((prev) => {
        const next = { ...prev };
        for (const p of properties) delete next[p];
        return next;
      });
      await refresh();
    });

  const openLayers = async () => {
    setManual(true);
    if (layers) return;
    try {
      setLayers(await listFigmaLayers(projectId));
    } catch (err) {
      setLayersError(err instanceof Error ? err.message : "Could not load Figma layers.");
    }
  };

  if (loading && !result) {
    return (
      <section className={card}>
        <p className="text-xs text-[var(--muted)]">Comparing this element with your Figma frame…</p>
      </section>
    );
  }

  if (error && !result) {
    return (
      <section className={card}>
        <p role="alert" className="text-xs font-semibold text-[var(--err)]">
          {error}
        </p>
        <PillButton className="mt-2" onClick={() => void compare(snapshot, nodeId)}>
          Try again
        </PillButton>
      </section>
    );
  }

  if (!result) return null;

  // Everything that differed from Figma: what is being previewed now plus what is still different.
  const pending = result.suggested_fixes.filter((f) => !applied[f.css_property]);
  const allFixes = [...Object.values(applied), ...pending];
  const selector = snapshot.selector || ".selected-element";
  const fixCss = allFixes.length
    ? `${selector} {\n${allFixes.map((f) => `  ${f.css_property}: ${f.expected};`).join("\n")}\n}`
    : "";
  const fixTailwind = [...new Set(allFixes.flatMap((f) => f.tailwind ?? []))].join(" ");
  const comparable = result.categories.filter((c) => c.fraction !== null);
  const skipped = result.categories.filter((c) => c.fraction === null).map((c) => c.name);

  return (
    <div className="space-y-3">
      <ScoreBreakdown card={toCard(result)} />

      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--muted)]">
              Compared with Figma layer{manual ? " (chosen by you)" : " (matched automatically)"}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--ink)]">
              {result.matched_node.name || result.matched_node.id}{" "}
              <span className="font-normal text-[var(--muted)]">
                · {result.matched_node.type}
                {result.text_node ? ` + text “${result.text_node.name}”` : ""} in{" "}
                {result.project.frame_name ?? "selected frame"}
              </span>
            </p>
          </div>
          <PillButton variant="ghost" className="shrink-0" onClick={() => void openLayers()}>
            Change
          </PillButton>
        </div>
        {manual && (
          <div className="mt-2">
            {layersError ? (
              <p className="text-[11px] text-[var(--err)]">{layersError}</p>
            ) : !layers ? (
              <p className="text-[11px] text-[var(--muted)]">Loading layers…</p>
            ) : (
              <select
                aria-label="Figma layer to compare with"
                className="w-full rounded-lg border-[1.5px] border-[var(--field-border)] bg-[var(--field)] px-2 py-1.5 text-xs text-[var(--ink)]"
                value={nodeId ?? ""}
                onChange={(e) => {
                  setNodeId(e.target.value);
                  void guarded(() => refresh(e.target.value));
                }}
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name || layer.id} · {layer.type}
                    {layer.text ? ` · “${layer.text}”` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>

      <section className={card}>
        <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">By category</h3>
        <ul>
          {comparable.map((c) => {
            const ok = (c.fraction ?? 0) >= 0.999;
            return (
              <li key={c.id} className="border-t border-[var(--line)] py-1.5 first:border-t-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ink)]">{c.name}</span>
                  <span
                    className={`rounded-full px-2 py-[1px] text-[10px] font-bold ${
                      ok ? "bg-[var(--badge-bg)] text-[var(--badge-text)]" : "bg-[#FFF1DC] text-[#8A5200]"
                    }`}
                  >
                    {ok ? "Match ✓" : `${Math.round((c.fraction ?? 0) * 100)}%`}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="min-w-0 rounded-md bg-[#FFF8EE] px-2 py-1 text-[#5a3a00]">
                    <b className="block text-[9px] tracking-wide">CURRENT</b>
                    <Swatches text={c.current ?? ""} />
                    {c.current || "—"}
                  </div>
                  <div className="min-w-0 rounded-md bg-[#F6F3FF] px-2 py-1 text-[#2c1a6b]">
                    <b className="block text-[9px] tracking-wide">FIGMA</b>
                    <Swatches text={c.expected ?? ""} />
                    {c.expected || "—"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {skipped.length > 0 && (
          <p className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] text-[var(--muted)]">
            Not comparable for this element/layer: {skipped.join(", ")}.
          </p>
        )}
      </section>

      <section className={card}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Live Design Sync</h3>
          <div className="flex gap-1.5">
            {pending.length > 1 && (
              <PillButton disabled={busy || !canPreview} onClick={() => void apply(pending)}>
                Apply all
              </PillButton>
            )}
            {Object.keys(applied).length > 0 && (
              <PillButton
                variant="ghost"
                disabled={busy}
                onClick={() => void revert(Object.keys(applied))}
              >
                Revert all
              </PillButton>
            )}
          </div>
        </div>
        {!canPreview && (
          <p className="mb-2 text-[10px] text-[var(--muted)]">
            Previews need an element selected in the DevTools Elements panel.
          </p>
        )}
        {actionError && (
          <p role="alert" className="mb-2 text-[11px] font-semibold text-[var(--err)]">
            {actionError}
          </p>
        )}
        {allFixes.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Every comparable property matches Figma. 🎉</p>
        ) : (
          <ul className="scroll max-h-60 overflow-y-auto pr-1">
            {allFixes.map((f) => {
              const on = Boolean(applied[f.css_property]);
              return (
                <li
                  key={f.css_property}
                  className="flex items-center gap-2 border-t border-[var(--line)] py-1.5 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--ink)]">
                      {LABELS[f.property] ?? f.css_property}
                      {on && (
                        <span className="ml-1.5 rounded-full bg-[var(--card-tint)] px-1.5 text-[9px] font-bold text-[var(--p1)]">
                          PREVIEWING
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[10px] text-[var(--muted)]" title={`${f.current} → ${f.expected}`}>
                      <Swatches text={f.current} />
                      {f.current} → <Swatches text={f.expected} />
                      {f.expected}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={ai.busy}
                    title="Ask the AI about this change"
                    onClick={() =>
                      void ai.ask(
                        `Explain the ${LABELS[f.property] ?? f.css_property} change from ${f.current} to ${f.expected}: what will look different, and is it safe to apply?`
                      )
                    }
                    className="flex-none cursor-pointer px-1 text-[11px] font-bold text-[var(--p1)] disabled:opacity-50"
                  >
                    Why?
                  </button>
                  {on ? (
                    <PillButton variant="ghost" disabled={busy} onClick={() => void revert([f.css_property])}>
                      Revert
                    </PillButton>
                  ) : (
                    <PillButton disabled={busy || !canPreview} onClick={() => void apply([f])}>
                      Apply
                    </PillButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Previews are temporary inline styles on this element only. Reloading the page removes them;
          your source files are never changed.
        </p>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Code</h3>
          <div className="flex gap-1">
            <PillButton variant={codeMode === "fixes" ? "ghostOn" : "ghost"} onClick={() => setCodeMode("fixes")}>
              Fixes only
            </PillButton>
            <PillButton variant={codeMode === "all" ? "ghostOn" : "ghost"} onClick={() => setCodeMode("all")}>
              All Figma values
            </PillButton>
          </div>
        </div>
        <CodeBlock label="CSS" code={codeMode === "fixes" ? fixCss : result.target_css_rule} />
        <CodeBlock
          label="Tailwind classes"
          code={codeMode === "fixes" ? fixTailwind : result.tailwind_classes.join(" ")}
        />
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Named Tailwind classes are only used where they match exactly (16px root); everything else uses
          arbitrary values. The selector is a best guess; check it targets the right element.
        </p>
      </section>

      <AskBox
        items={ai.items}
        busy={ai.busy}
        onAsk={(q) => void ai.ask(q)}
        explainQuestion="Explain these results in plain words: what differs from the Figma design, and which fix should I apply first?"
        placeholder="Ask about this element's design…"
      />

      <PillButton variant="ghost" className="w-full" disabled={busy || loading} onClick={() => void guarded(() => refresh())}>
        {loading ? "Comparing…" : "Re-compare"}
      </PillButton>
    </div>
  );
}
