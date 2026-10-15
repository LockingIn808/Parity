import type { TabItem } from "../global";

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-full border border-[#E3E0FF] bg-white/70 p-1.5 shadow-[0_2px_12px_rgba(147,129,255,0.15)] backdrop-blur">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={
              "flex-1 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition " +
              (isActive
                ? "bg-[#5748CC] text-white shadow-[0_6px_16px_rgba(87,72,204,0.35)]"
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