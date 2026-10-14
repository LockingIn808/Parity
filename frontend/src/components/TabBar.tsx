import logo from "../assets/ParityLogo.png";
import type { TabItem } from "../global";

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  showLogo?: boolean; // logo above the tabs (default on)
}

export default function TabBar({ tabs, active, onChange, showLogo = true }: Props) {
  return (
    <div className="space-y-8">
      {showLogo && (
        <img src={logo} alt="Parity logo" className="h-12 w-auto" />
      )}

      <div className="flex gap-3">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                "flex-1 cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium " +
                (isActive
                  ? "border-[#7F82E8] bg-[#8A8CF2] text-white"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}