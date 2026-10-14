import type { ReactNode } from "react";
import type { Category } from "../global";

interface Props {
  segments: Category[];
  onSelect?: (segment: Category) => void;
  size?: number;        // internal drawing size and max display size
  thickness?: number;   // ring thickness
  gap?: number;         // white space between slices
  track?: boolean;      // show the gray empty ring
  children?: ReactNode; // center content
}

export default function PieChart({
  segments,
  onSelect,
  size = 140,
  thickness = 22,
  gap = 3,
  track = true,
  children,
}: Props) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const useGap = segments.length > 1 ? gap : 0;
  let offset = 0;

  return (
    <div className="relative aspect-square w-full" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        {/* background track (empty part of the ring) */}
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          strokeWidth={thickness}
          className={track ? "stroke-gray-200" : "stroke-transparent"}
        />
        {/* thin outline on the outer and inner edge of the ring */}
        <circle
          cx={size / 2} cy={size / 2} r={r + thickness / 2 - 0.5}
          fill="none" strokeWidth={1} className="stroke-gray-300"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r - thickness / 2 + 0.5}
          fill="none" strokeWidth={1} className="stroke-gray-300"
        />
        {segments.map((s) => {
          const full = (s.value / 100) * circumference;
          const len = Math.max(0, full - useGap);
          const slice = (
            <circle
              key={s.label}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-(offset + useGap / 2)}
              onClick={() => onSelect?.(s)}
              className={onSelect ? "cursor-pointer hover:opacity-80" : ""}
            />
          );
          offset += full;
          return slice;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-base font-bold leading-tight text-gray-900">
        {children}
      </div>
    </div>
  );
}