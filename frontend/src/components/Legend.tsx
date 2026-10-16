import type { Category } from "../types/design";

interface Props {
  items: Category[];
  onSelect?: (item: Category) => void;
}

export default function Legend({ items, onSelect }: Props) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="flex w-full cursor-pointer items-center gap-2 text-left hover:opacity-80"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="w-20 text-xs text-gray-900">{item.label}</span>
            <span className="text-xs text-slate-500">
              {Math.round(item.value)}%
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}