import type { Slice } from "./ScoreBreakdown";

interface Props {
  slices: Slice[];
  rest: number;
  restLabel: string;
  active: number | null;
  onHover: (i: number | null) => void;
  onSelect?: (id: string) => void;
}

export default function Legend({ slices, rest, restLabel, active, onHover, onSelect }: Props) {
  return (
    <ul className="list-none">
      {slices.map((s, i) => {
        const cls =
          "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs font-semibold transition";
        const style = {
          opacity: active === null || active === i ? 1 : 0.45,
          background: active === i ? "var(--card-soft)" : "transparent",
        };
        const body = (
          <>
            <i className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: s.color }} />
            <span className="flex-1">{s.name}</span>
            <span>{s.value}%</span>
          </>
        );
        return (
          <li key={s.id}>
            {onSelect ? (
              <button
                type="button"
                className={`${cls} cursor-pointer`}
                style={style}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(s.id)}
              >
                {body}
              </button>
            ) : (
              <div className={cls} style={style}>
                {body}
              </div>
            )}
          </li>
        );
      })}
      {rest > 0 && (
        <li className="flex items-center gap-2 px-1.5 py-1 text-xs font-semibold text-[var(--muted)]">
          <i className="h-2.5 w-2.5 flex-none rounded-sm border border-[var(--track-line)] bg-[var(--track)]" />
          <span className="flex-1">{restLabel}</span>
          <span>{rest}%</span>
        </li>
      )}
    </ul>
  );
}