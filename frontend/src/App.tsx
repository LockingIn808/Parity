import { useEffect, useState } from "react";
import { TABS, type Screen, type Session, type TabId } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { parseFigma, loadFigmaFile } from "./lib/figma";
import { initialsOf } from "./lib/github";
import LandingPage from "./components/LandingPage";
import ConnectionStatus from "./components/ConnectionStatus";
import ProfileMenu from "./components/ProfileMenu";
import TabBar from "./components/TabBar";
import GithubLogin from "./pages/GithubLogin";
import GithubAuth from "./pages/GithubAuth";
import Connecting from "./pages/Connecting";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import ComponentDetail from "./pages/ComponentDetail";
import Account from "./pages/Account";
import mark from "./assets/mark.png";

const EMPTY: Session = { user: "", file: "", url: "" };

export default function App() {
  const [session, setSession, ready] = usePersistentState<Session>("parity-session", EMPTY);
  const [screen, setScreen] = useState<Screen>("landing");
  const [tab, setTab] = useState<TabId>("figma");
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "fonts"
  const [account, setAccount] = useState(false);
  const [figmaError, setFigmaError] = useState(false);
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  const [booted, setBooted] = useState(false);

  // Returning users skip the landing page. Runs once, after the saved session has loaded.
  useEffect(() => {
    if (!ready || booted) return;
    setBooted(true);
    if (session.user) {
      setScreen("app");
      setTab(session.file ? "design" : "figma");
    }
  }, [ready, booted, session]);

  const goTab = (t: TabId) => {
    setTab(t);
    setDetail(null);
    setAccount(false);
    setFigmaError(false);
  };

  const signIn = (user: string) => {
    setSession((s) => ({ ...s, user }));
    setScreen("githubAuth");
  };

  const signOut = () => {
    setSession(EMPTY);
    setScreen("landing");
    setTab("figma");
    setDetail(null);
    setAccount(false);
  };

  const connect = async (url: string) => {
    const ref = parseFigma(url);
    setSession((s) => ({ ...s, url }));
    if (!ref) {
      setFigmaError(true);
      return;
    }
    setFigmaError(false);
    setSession((s) => ({ ...s, url, file: ref.name }));
    setLoaded(false);
    setScreen("connecting");
    try {
      await loadFigmaFile(ref.key);
      setLoaded(true);
    } catch {
      setScreen("app");
      setTab("figma");
      setFigmaError(true);
    }
  };

  const openFile = (name: string) => {
    setSession((s) => ({ ...s, file: name }));
    goTab("design");
  };

  if (!ready) return null; // wait for saved state so the landing page does not flash

  if (screen === "landing") return <LandingPage onGithub={() => setScreen("githubLogin")} />;
  if (screen === "githubLogin") {
    return <GithubLogin onBack={() => setScreen("landing")} onSubmit={signIn} />;
  }
  if (screen === "githubAuth") {
    return (
      <GithubAuth
        user={session.user}
        onAuthorize={() => {
          setScreen("app");
          goTab("figma");
        }}
        onCancel={() => setScreen("landing")}
      />
    );
  }
  if (screen === "connecting") {
    return (
      <Connecting
        ready={loaded}
        onDone={() => {
          setScreen("app");
          goTab("design");
        }}
        onCancel={() => {
          setScreen("app");
          goTab("figma");
        }}
      />
    );
  }

  return (
    <div className="parity-bg parity-dashboard mx-auto w-full max-w-[560px] space-y-3 rounded-2xl p-4">
      <header className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
        <img src={mark} alt="Parity" className="h-8 w-8 object-contain" />
        <div className="flex justify-center">
          <ConnectionStatus file={session.file} />
        </div>
        <ProfileMenu
          initials={initialsOf(session.user)}
          onOpen={() => {
            setAccount(true);
            setDetail(null);
          }}
        />
      </header>

      <TabBar tabs={TABS} active={account ? null : tab} onChange={goTab} />

      {account ? (
        <Account user={session.user} file={session.file} onSignOut={signOut} />
      ) : tab === "figma" ? (
        <FigmaLink url={session.url} error={figmaError} onConnect={connect} onOpen={openFile} />
      ) : detail ? (
        <ComponentDetail report={tab} partId={detail} onBack={() => setDetail(null)} />
      ) : tab === "design" ? (
        <DesignComparison onSelect={setDetail} />
      ) : (
        <AccessibilityScore onSelect={setDetail} />
      )}
    </div>
  );
}