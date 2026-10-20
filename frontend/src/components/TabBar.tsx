import type { TabId, TabItem } from "../global";

interface Props {
  tabs: TabItem[];
  active: TabId | null; // null = nothing highlighted (Account page)
  onChange: (t: TabId) => void;
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <nav
      aria-label="Sections"
      className="flex gap-1 rounded-full bg-white p-1 shadow-[0_2px_8px_rgba(91,51,200,.08)]"
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(t.id)}
            className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ${
              on ? "bg-[var(--p1)] text-white" : "text-[var(--ink2)]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}