import ChangeItem from "./ChangeItem";
import type { Change } from "../types/changes";

interface Props {
  changes: Change[];
  onPreview?: (id: string) => void;
  onCommit?: (id: string) => void;
}

export default function ChangesList({ changes, onPreview, onCommit }: Props) {
  return (
    <section className="rounded-2xl border border-gray-300 bg-white p-4">
      <h3 className="mb-2 text-base font-semibold text-gray-900">
        Changes to Prioritize
      </h3>
      <ul className="max-h-48 overflow-y-auto">
        {changes.map((c) => (
          <ChangeItem
            key={c.id}
            change={c}
            onPreview={onPreview}
            onCommit={onCommit}
          />
        ))}
      </ul>
    </section>
  );
}