import PieChart from "./PieChart";
import Legend from "./Legend";
import type { Category } from "../types/design";

const VIEW_HEIGHT = 140;
const CHART_SIZE = 120;

interface Props {
  title: string;
  categories: Category[];
  centerLabel?: string;
  selected: Category | null;
  onSelect: (c: Category | null) => void;
}

export default function ScoreBreakdown({
  title,
  categories,
  centerLabel = "Similar",
  selected,
  onSelect,
}: Props) {
  const maxPerCategory = 100 / categories.length;

  const overviewSegments: Category[] = categories.map((c) => ({
    ...c,
    value: ((c.score ?? 0) / 100) * maxPerCategory,
  }));

  const overall = Math.round(
    overviewSegments.reduce((sum, c) => sum + c.value, 0)
  );

  if (selected) {
    return (
      <div className="relative" style={{ height: VIEW_HEIGHT }}>
        <h2 className="absolute left-0 top-0 text-base font-bold text-gray-900">
          {selected.label}
        </h2>
        <div className="mx-auto mt-2" style={{ width: CHART_SIZE }}>
          <PieChart
            segments={[{ ...selected, value: selected.score ?? 0 }]}
            size={CHART_SIZE}
            thickness={22}
          >
            <span className="text-sm">
              {selected.score}%<br />
              {centerLabel}
            </span>
          </PieChart>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Back"
          className="absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-[#5748CC] text-white"
        >
          ←
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ height: VIEW_HEIGHT }}
    >
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <Legend items={overviewSegments} onSelect={onSelect} />
      </div>
      <div className="shrink-0" style={{ width: CHART_SIZE }}>
        <PieChart
          segments={overviewSegments}
          onSelect={onSelect}
          size={CHART_SIZE}
          thickness={22}
        >
          <span className="text-sm">
            {overall}%<br />
            {centerLabel}
          </span>
        </PieChart>
      </div>
    </div>
  );
}