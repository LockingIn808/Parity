import { useState } from "react";
import type { Part, Report } from "../types/design";
import { score } from "../data/changes";
import PieChart from "./PieChart";
import Legend from "./Legend";

const VIEW_HEIGHT = 140;
const CHART_SIZE = 120;

export interface Slice {
  id: string;
  name: string;
  color: string;
  value: number;
}
export interface CardData {
  title: string;
  slices: Slice[];
  total: number; // big number in the middle
  totalLabel: string; // small label under it
  remainderLabel: string; // name of the unfilled part
}

/** Overview card: one slice per part. */
export const overviewCard = (r: Report): CardData => ({
  title: r.title,
  slices: r.parts.map((p) => ({ id: p.id, name: p.name, color: p.color, value: p.share })),
  total: score(r),
  totalLabel: r.goodLabel,
  remainderLabel: r.remainderLabel,
});

/** Detail card: one part on its own. 14 of 30 points shows as 47%. */
export const partCard = (r: Report, p: Part): CardData => {
  const pct = Math.round((p.share / p.weight) * 100);
  return {
    title: p.name,
    slices: [{ id: p.id, name: r.goodLabel, color: p.color, value: pct }],
    total: pct,
    totalLabel: r.goodLabel,
    remainderLabel: r.detailRemainderLabel,
  };
};

interface Props {
  card: CardData;
  onSelect?: (id: string) => void;
}

export default function ScoreBreakdown({ card, onSelect }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const rest = 100 - card.slices.reduce((n, s) => n + s.value, 0);
  const hovered = active !== null ? card.slices[active] : null;

  return (
    <section
      aria-label={card.title}
      className="rounded-2xl border border-[#E4DAFD] bg-[linear-gradient(160deg,#fff_0%,#F4EFFF_100%)] p-4 shadow-[0_16px_36px_rgba(90,50,198,.24),0_2px_6px_rgba(90,50,198,.10)]"
    >
      <div className="flex items-center gap-4" style={{ minHeight: VIEW_HEIGHT }}>
        <PieChart
          slices={card.slices}
          remainder={rest}
          active={active}
          onHover={setActive}
          onSelect={onSelect}
          size={CHART_SIZE}
          centerValue={`${hovered ? hovered.value : card.total}%`}
          centerLabel={hovered ? hovered.name : card.totalLabel}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-base font-bold text-[var(--ink)]">{card.title}</h2>
          <Legend
            slices={card.slices}
            rest={rest}
            restLabel={card.remainderLabel}
            active={active}
            onHover={setActive}
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  );
}