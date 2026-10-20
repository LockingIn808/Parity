import type { Change, Part } from "../types/design";
import PillButton from "./PillButton";
import PreviewSample from "./PreviewSample";

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

interface Props {
  change: Change;
  part: Part;
  subtitle: string;
  open: boolean;
  done: boolean;
  onPreview: () => void;
  onCommit: () => void;
}

export default function ChangeItem({ change, part, subtitle, open, done, onPreview, onCommit }: Props) {
  // dark sparkle on the light tiles, white on the dark ones
  const ink = luma(part.color) > 0.6 ? "#3A1F78" : "#fff";
  return (
    <li className="border-t border-[var(--line)]">
      <div className="flex items-center gap-3 py-2">
        <span
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg"
          style={{ background: part.color }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z" fill={ink} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{change.title}</p>
          <p className="text-[11px] text-[var(--muted)]">{subtitle}</p>
        </div>
        <PillButton variant={open ? "ghostOn" : "ghost"} aria-expanded={open} onClick={onPreview}>
          Preview
        </PillButton>
        <PillButton variant={done ? "soft" : "primary"} onClick={onCommit} className="sm:min-w-[100px]">
          {done ? "Committed ✓" : "Commit"}
        </PillButton>
      </div>
      {open && (
        <div className="flex gap-2 pb-2">
          <PreviewSample partId={part.id} />
        </div>
      )}
    </li>
  );
}