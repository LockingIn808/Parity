import ScoreBreakdown, { partCard } from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import type { Report } from "../types/design";

interface Props {
  report: Report; // the real report shown on the overview
  partId: string;
  onBack: () => void;
}

export default function ComponentDetail({ report, partId, onBack }: Props) {
  const r = report;
  const part = r.parts.find((p) => p.id === partId);
  if (!part) return null;
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer text-xs font-semibold text-[var(--p1)]"
      >
        &#8249; Back to overview
      </button>
      <ScoreBreakdown card={partCard(r, part)} />
      <ChangesList changes={r.changes.filter((c) => c.partId === part.id)} parts={[part]} sub="fix" />
    </div>
  );
}