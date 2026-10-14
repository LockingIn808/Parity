import PillButton from "./PillButton";
import type { Change } from "../types/changes";

interface Props {
  change: Change;
  onPreview?: (id: string) => void;
  onCommit?: (id: string) => void;
}

export default function ChangeItem({ change, onPreview, onCommit }: Props) {
  return (
    <li className="flex items-center gap-3 border-t border-gray-300 py-2 first:border-t-0">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: change.color }}
      />
      <span className="flex-1 truncate text-sm text-gray-900">
        {change.label}
      </span>
      <PillButton label="Preview" onClick={() => onPreview?.(change.id)} />
      <PillButton
        label="Commit"
        variant="primary"
        onClick={() => onCommit?.(change.id)}
      />
    </li>
  );
}