/**
 * Turns real results into the team's original data shapes (Report / Part / Change and the
 * element PartResult), so the original screens render them unchanged.
 */
import type { Change, Part, Priority, Report } from "../types/design";
import type { CompareResult, PageCompareResult, SuggestedFix } from "./api";
import type { PageAccessibility, PartResult } from "./score";
import type { FixRef, LiveDesign } from "../hooks/useLiveDesign";

// Same palette and labels as the original sample reports (data/changes.ts).
const P1 = "#5A32C6", P2 = "#8F72F0", P3 = "#B7A3F5", P4 = "#EFB87A", P5 = "#F7D9B4";
const DESIGN_PARTS: Record<string, { color: string; fixLabel: string }> = {
  fonts: { color: P1, fixLabel: "Font change" },
  color: { color: P2, fixLabel: "Color change" },
  spacing: { color: P3, fixLabel: "Spacing change" },
  sizing: { color: P4, fixLabel: "Sizing change" },
};
const A11Y_PARTS: Record<string, { color: string; fixLabel: string; title: string }> = {
  contrast: { color: P1, fixLabel: "Contrast fix", title: "Low color contrast" },
  labels: { color: P2, fixLabel: "Label fix", title: "Missing label or alt text" },
  semantics: { color: P3, fixLabel: "Semantics fix", title: "Unclear element role" },
  interaction: { color: P4, fixLabel: "Interaction fix", title: "Hard to click or focus" },
  other: { color: P5, fixLabel: "Other fix", title: "Page-level issue" },
};

/** Which design part each compared property belongs to (matches the backend categories). */
export const PART_OF: Record<string, string> = {
  fontFamily: "fonts", fontSize: "fonts", fontWeight: "fonts",
  color: "color", background: "color",
  padding: "spacing", gap: "spacing",
  width: "sizing", height: "sizing", borderRadius: "sizing",
};
export const LABEL: Record<string, string> = {
  fontFamily: "Font", fontSize: "Font size", fontWeight: "Font weight", color: "Text color",
  background: "Background", padding: "Padding", gap: "Gap", width: "Width", height: "Height",
  borderRadius: "Corner radius",
};

const priorityFor = (score: number): Priority =>
  score < 60 ? "High priority" : score < 85 ? "Medium priority" : "Low priority";
const ORDER: Record<Priority, number> = { "High priority": 0, "Medium priority": 1, "Low priority": 2 };

/** Parts that apply, with weights as points out of 100 (what overviewCard / partCard expect). */
function toParts(
  raw: { id: string; name: string; weight: number; fraction: number | null }[],
  meta: Record<string, { color: string; fixLabel: string }>
): Part[] {
  const live = raw.filter((p) => p.fraction !== null);
  const total = live.reduce((n, p) => n + p.weight, 0) || 1;
  return live.map((p) => {
    const weight = Math.round((p.weight / total) * 100);
    return {
      id: p.id,
      name: p.name,
      weight,
      share: Math.round((p.fraction ?? 0) * weight),
      color: meta[p.id]?.color ?? P3,
      fixLabel: meta[p.id]?.fixLabel ?? "Change",
    };
  });
}

const cssRule = (selector: string, fixes: { property: string; value: string }[]) =>
  `${selector} {\n${fixes.map((f) => `  ${f.property}: ${f.value};`).join("\n")}\n}`;

const short = (text: string | null | undefined, max = 28) =>
  text ? (text.length > max ? `${text.slice(0, max - 1)}…` : text) : "";

type Ask = (question: string) => void;

/** Design overview: the whole page against the Figma frame. */
export function designPageReport(page: PageCompareResult, live: LiveDesign, ask: Ask): Report {
  const changes: Change[] = [];
  for (const el of page.elements) {
    if (!el.parity_id) continue;
    for (const fix of el.fixes) {
      const ref: FixRef = { selector: el.selector, property: fix.css_property, value: fix.expected };
      const label = LABEL[fix.property] ?? fix.css_property;
      const where = short(el.text) ? `“${short(el.text)}”` : el.selector;
      changes.push({
        id: `${el.parity_id}:${fix.css_property}`,
        title: `${label} differs · ${where}`,
        priority: priorityFor(el.score),
        partId: PART_OF[fix.property] ?? "sizing",
        live: {
          figma: fix.expected,
          site: fix.current,
          committed: live.isCommitted([ref]),
          busy: live.busy,
          preview: (on) => live.preview(el.parity_id as string, [ref], on),
          commit: () => live.commit([ref]),
          revert: () => live.revert([ref]),
          why: () => ask(`Explain the ${label} difference on ${el.selector} (${fix.current} on the site, ${fix.expected} in Figma) and whether it is safe to change.`),
          css: cssRule(el.selector, [{ property: fix.css_property, value: fix.expected }]),
          tailwind: fix.tailwind?.join(" ") || undefined,
        },
      });
    }
  }
  changes.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);

  return {
    key: "design",
    title: "Design Similarity Score",
    goodLabel: "Similar",
    remainderLabel: "Remaining differences",
    detailRemainderLabel: "Different",
    parts: toParts(page.categories, DESIGN_PARTS),
    changes: changes.slice(0, 40),
  };
}

/** Accessibility overview: every scanned element. */
export function accessibilityPageReport(page: PageAccessibility, ask: Ask): Report {
  const changes: Change[] = [];
  for (const issue of page.issues) {
    for (const problem of issue.problems) {
      const where = short(issue.snap.text) ? `“${short(issue.snap.text)}”` : issue.snap.selector;
      const meta = A11Y_PARTS[problem.id];
      changes.push({
        id: `${issue.snap.parityId}:${problem.id}`,
        title: `${meta?.title ?? problem.name} · ${where}`,
        priority: priorityFor(Math.round(problem.fraction * 100)),
        partId: problem.id,
        live: {
          figmaLabel: "GOAL",
          figma: problem.goal,
          site: problem.site,
          why: () => ask(`Explain the ${problem.name} problem on ${issue.snap.selector} (${problem.site}; goal: ${problem.goal}) and how to fix it.`),
        },
      });
    }
  }
  changes.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);

  return {
    key: "accessibility",
    title: "Accessibility Score",
    goodLabel: "Accessible",
    remainderLabel: "Remaining issues",
    detailRemainderLabel: "Needs fixing",
    parts: toParts(page.result.parts, A11Y_PARTS),
    changes: changes.slice(0, 40),
  };
}

/** Element design view: the backend's categories as the original PartResult rows. */
export function designElementParts(result: CompareResult): PartResult[] {
  return result.categories.map((c) => {
    const fixes = result.suggested_fixes.filter((f) => PART_OF[f.property] === c.id);
    const pct = c.fraction === null ? null : Math.round(c.fraction * 100);
    return {
      id: c.id,
      name: c.name,
      color: DESIGN_PARTS[c.id]?.color ?? P3,
      weight: c.weight,
      fraction: c.fraction,
      note: pct === null ? "Not in this Figma layer" : pct >= 100 ? "Matches Figma" : `${pct}% match`,
      fix: fixes.map((f) => `${LABEL[f.property] ?? f.css_property} ${f.current} → ${f.expected}`).join(", "),
      site: c.current ?? "",
      goal: c.expected ?? "",
    };
  });
}

/** The fixes behind one element part, as commit/preview references. */
export function fixesForPart(result: CompareResult, selector: string, partId: string): { refs: FixRef[]; fixes: SuggestedFix[] } {
  const fixes = result.suggested_fixes.filter((f) => PART_OF[f.property] === partId);
  return { fixes, refs: fixes.map((f) => ({ selector, property: f.css_property, value: f.expected })) };
}

export { cssRule };
