import ScoreBreakdown, { overviewCard } from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import AskBox from "../components/AskBox";
import { StatusCard, type Loadable } from "./DesignComparison";
import type { Report } from "../types/design";
import type { QA } from "../hooks/useAsk";

interface Props {
  report: Loadable<Report>;
  onSelect: (partId: string) => void;
  ask: { items: QA[]; busy: boolean; onAsk: (q: string) => void };
}

/** Accessibility tab overview: every visible element on the page, checked. */
export default function AccessibilityScore({ report, onSelect, ask }: Props) {
  if (report.status === "idle" || report.status === "loading") {
    return <StatusCard text="Checking this page…" />;
  }
  if (report.status === "error") {
    return <StatusCard title="Couldn’t check this page" text={report.error} />;
  }
  if (report.data.parts.length === 0) {
    return <StatusCard text="No visible text, links, buttons, images or form fields were found on this page." />;
  }
  return (
    <div className="space-y-3">
      <ScoreBreakdown card={overviewCard(report.data)} onSelect={onSelect} />
      <ChangesList changes={report.data.changes} parts={report.data.parts} />
      <AskBox items={ask.items} busy={ask.busy} onAsk={ask.onAsk} placeholder="Ask about accessibility issues..." />
    </div>
  );
}
