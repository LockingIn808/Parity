import { useState } from "react";
import TabBar from "./components/TabBar";
import ConnectionStatus from "./components/ConnectionStatus";
import ProfileMenu from "./components/ProfileMenu";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import logo from "./assets/ParityLogo.png";
import { TABS, type User } from "./global";

const USER: User = { name: "Preet" };

export default function App() {
  const [tab, setTab] = useState("figma");
  const [figmaLink, setFigmaLink] = useState("");

  const handleConnected = (url: string) => {
    setFigmaLink(url);
    setTab("design");
  };

  return (
    <div className="parity-bg mx-auto w-full max-w-[560px] space-y-3 rounded-2xl p-4">
      <header className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
        <img src={logo} alt="Parity logo" className="h-8 w-8 object-contain" />
        <div className="flex justify-center">
          <ConnectionStatus link={figmaLink} />
        </div>
        <div className="flex justify-end">
          <ProfileMenu
            user={USER}
            onSignOut={() => console.log("sign out")}
          />
        </div>
      </header>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "figma" && <FigmaLink onConnected={handleConnected} />}
      {tab === "design" && <DesignComparison />}
      {tab === "accessibility" && <AccessibilityScore />}
    </div>
  );
}