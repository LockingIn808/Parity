import type { Category } from "../types/design";

interface Props {
  items: Category[];
  onSelect?: (item: Category) => void;
}

export default function Legend({ items, onSelect }: Props) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="flex w-full cursor-pointer items-center gap-3 text-left hover:opacity-80"
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="w-20 text-sm text-gray-900">{item.label}</span>
            <span className="text-sm text-slate-500">
              {Math.round(item.value)}%
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}