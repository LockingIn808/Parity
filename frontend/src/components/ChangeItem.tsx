import type { Change, Part } from "../types/design";
import PillButton from "./PillButton";
import PreviewSample from "./PreviewSample";
import { ActionLinks, ValueTile } from "./LiveBits";

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
      <div className="flex items-center gap-2.5 py-1.5">
        <span
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
          style={{ background: part.color }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z" fill={ink} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--ink)]">{change.title}</p>
          <p className="text-[10px] text-[var(--muted)]">{subtitle}</p>
        </div>
        <PillButton variant={open ? "ghostOn" : "ghost"} aria-expanded={open} onClick={onPreview}>
          Preview
        </PillButton>
        <PillButton
          variant={done ? "soft" : "primary"}
          onClick={onCommit}
          disabled={change.live?.busy}
          className="sm:min-w-[84px]"
        >
          {done ? (change.live?.revert ? "Revert" : "Committed ✓") : "Commit"}
        </PillButton>
      </div>
      {open && change.live && (
        <>
          <div className="flex gap-2 pb-2">
            <ValueTile label={change.live.figmaLabel ?? "FIGMA"} text={change.live.figma} />
            <ValueTile label="YOUR SITE" text={change.live.site} site />
          </div>
          <ActionLinks live={change.live} />
        </>
      )}
      {open && !change.live && (
        <div className="flex gap-2 pb-2">
          <PreviewSample partId={part.id} />
        </div>
      )}
    </li>
  );
}