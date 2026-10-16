import type { TabItem } from "../global";

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-full border border-[#E3E0FF] bg-white/70 p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={
              "flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#9381FF] " +
              (isActive
                ? "bg-[#5748CC] text-white"
                : "text-[#1E1B4B] hover:bg-[#EFEDFF]")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}