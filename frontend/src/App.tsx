import { useState } from "react";
import TabBar from "./components/TabBar";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import FigmaLink from "./pages/FigmaLink";
import { TABS } from "./global";


export default function App() {
  const [tab, setTab] = useState("figma");

  return (
    <div className="max-w-[560px] space-y-4 rounded-2xl bg-[#F5F4FD] p-6">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === "design" && <DesignComparison />}
      {tab === "accessibility" && <AccessibilityScore />}
      {tab === "figma" && <FigmaLink onConnected={() => setTab("design")} />}
    </div>
  );
}