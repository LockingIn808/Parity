import PieChart from "./PieChart";
import Legend from "./Legend";
import type { Category } from "../types/design";

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
  // Each category fills at most 1/N of the overview pie (25 when there are four)
  const maxPerCategory = 100 / categories.length;

  const overviewSegments: Category[] = categories.map((c) => ({
    ...c,
    value: ((c.score ?? 0) / 100) * maxPerCategory,
  }));

  const overall = Math.round(
    overviewSegments.reduce((sum, c) => sum + c.value, 0)
  );

  // Detail view: same height as the overview so the page doesn't jump
  if (selected) {
    return (
      <div className="relative h-[181px]">
        <h2 className="absolute left-0 top-0 text-xl font-bold text-gray-900">
          {selected.label}
        </h2>
        <div className="mx-auto mt-4 w-[165px] max-w-full">
          <PieChart segments={[{ ...selected, value: selected.score ?? 0 }]}>
            <span>{selected.score}%<br />{centerLabel}</span>
          </PieChart>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Back"
          className="absolute bottom-0 right-0 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-violet-500 text-white"
        >
          ←
        </button>
      </div>
    );
  }

  // Overview: title + legend on the left, pie on the right
  return (
    <div className="flex h-[181px] items-center justify-between gap-4">
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Legend items={overviewSegments} onSelect={onSelect} />
      </div>
      <div className="mt-4 w-[165px] max-w-[45%] shrink-0">
        <PieChart segments={overviewSegments} onSelect={onSelect}>
          <span>{overall}%<br />{centerLabel}</span>
        </PieChart>
      </div>
    </div>
  );
}