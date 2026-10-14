import { useState } from "react";
import TabBar from "./components/TabBar";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";

const TABS = [
  { id: "figma", label: "Figma Link" },
  { id: "design", label: "Design" },
  { id: "accessibility", label: "Accessibility" },
];

export default function App() {
  const [tab, setTab] = useState("design");

  return (
    <div className="max-w-[560px] space-y-4 rounded-2xl bg-[#F5F4FD] p-6">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === "design" && <DesignComparison />}
      {tab === "accessibility" && <AccessibilityScore />}
      {tab === "figma" && <p>Home page goes here</p>}
    </div>
  );
}