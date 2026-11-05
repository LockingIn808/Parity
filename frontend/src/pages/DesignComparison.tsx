import ScoreBreakdown, { overviewCard } from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import PillButton from "../components/PillButton";
import AskBox from "../components/AskBox";
import type { Report } from "../types/design";
import type { QA } from "../hooks/useAsk";
import type { ElementSnapshot } from "../lib/inspect";

export interface ComparedElement {
  selector: string;
  score: number;
  snap: ElementSnapshot;
}

export type Loadable<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; data: T };

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

/** Small card for the states the sample screens never had: not connected, scanning, errors. */
export function StatusCard({ title, text, action }: { title?: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <section className={card}>
      {title && <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>}
      <p className={`text-xs text-[var(--muted)] ${title ? "mt-1" : ""}`}>{text}</p>
      {action && (
        <PillButton className="mt-3" onClick={action.onClick}>
          {action.label}
        </PillButton>
      )}
    </section>
  );
}

interface Props {
  report: Loadable<Report>;
  connected: boolean;
  onSelect: (partId: string) => void;
  onGoFigma: () => void;
  ask: { items: QA[]; busy: boolean; onAsk: (q: string) => void };
}

/** Design tab overview: the whole page compared with the selected Figma frame. */
export default function DesignComparison({ report, connected, onSelect, onGoFigma, ask }: Props) {
  if (!connected) {
    return (
      <StatusCard
        title="Connect your Figma design"
        text="Paste your Figma link and choose a frame to see how this page compares."
        action={{ label: "Go to Figma Link", onClick: onGoFigma }}
      />
    );
  }
  if (report.status === "idle" || report.status === "loading") {
    return <StatusCard text="Comparing this page with your Figma design…" />;
  }
  if (report.status === "error") {
    return <StatusCard title="Couldn’t score this page" text={report.error} />;
  }
  if (report.data.parts.length === 0) {
    return (
      <StatusCard
        title="Nothing on this page matches the selected frame"
        text="Parity pairs page elements with Figma layers mostly by their text. Check that this page was built from the frame you chose, or inspect an element to compare it directly."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ScoreBreakdown card={overviewCard(report.data)} onSelect={onSelect} />
      <ChangesList changes={report.data.changes} parts={report.data.parts} />
      <AskBox items={ask.items} busy={ask.busy} onAsk={ask.onAsk} placeholder="Ask about design differences..." />
    </div>
  );
}
