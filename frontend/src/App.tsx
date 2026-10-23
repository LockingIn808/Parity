import { useEffect, useRef, useState } from "react";
import { TABS, type Screen, type Session, type TabId, type Theme } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSelectedElement } from "./hooks/useSelectedElement";
import { parseFigma, loadFigmaFile } from "./lib/figma";
import { initialsOf } from "./lib/github";
import { SAMPLE_ELEMENT, type ElementSnapshot } from "./lib/inspect";
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
import ElementScore from "./pages/ElementScore";
import Account from "./pages/Account";
import mark from "./assets/mark.png";

const EMPTY: Session = { user: "", file: "", url: "" };

export default function App() {
  const [session, setSession, ready] = usePersistentState<Session>("parity-session", EMPTY);
  const [theme, setTheme, themeReady] = usePersistentState<Theme>("parity-theme", "light");
  const [screen, setScreen] = useState<Screen>("landing");
  const [tab, setTab] = useState<TabId>("figma");
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "fonts"
  const [account, setAccount] = useState(false); // true = the Settings page is showing
  const [element, setElement] = useState<ElementSnapshot | null>(null); // picked on the website
  const [figmaError, setFigmaError] = useState(false);
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  const [booted, setBooted] = useState(false);

  // Clicking an element with the inspect tool opens its scores.
  const inDevtools = useSelectedElement((snap) => {
    if (screen !== "app") return;
    setElement(snap);
    setAccount(false);
    setDetail(null);
  });

  // Apply the theme to <html> so index.css can switch its colors.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
    setElement(null);
    setFigmaError(false);
  };

  const signIn = (user: string) => {
    setSession((s) => ({ ...s, user }));
    setScreen("githubAuth");
  };

  const signOut = () => {
    setSession(EMPTY); // the theme is saved separately, so it survives sign out
    setScreen("landing");
    setTab("figma");
    setDetail(null);
    setAccount(false);
    setElement(null);
  };

  const loadId = useRef(0);

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

    const id = ++loadId.current;
    // Only show the loading screen if loading takes longer than this
    let slow = false;
    const timer = setTimeout(() => {
      if (loadId.current !== id) return;
      slow = true;
      setScreen("connecting");
    }, 400);

    try {
      await loadFigmaFile(ref.key);
      clearTimeout(timer);
      if (loadId.current !== id) return; // cancelled or replaced
      if (slow) setLoaded(true); // the loading screen fills its bar, then moves on
      else goTab("design");      // fast load: skip the loading screen entirely
    } catch {
      clearTimeout(timer);
      if (loadId.current !== id) return;
      setScreen("app");
      setTab("figma");
      setFigmaError(true);
    }
  };

  const openFile = (name: string) => {
    setSession((s) => ({ ...s, file: name }));
    goTab("design");
  };

  if (!ready || !themeReady) return null; // wait for saved state so nothing flashes

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
          loadId.current++; 
          setScreen("app");
          goTab("figma");
        }}
      />
    );
  }

  return (
    <div className="parity-bg parity-dashboard">
      <div className="parity-inner mx-auto w-full max-w-[560px] space-y-3 p-4">
        <header className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
          <img
            src={mark}
            alt="Parity"
            className="h-8 w-8 rounded-lg object-contain dark:bg-[#ECE7FF] dark:p-1"
          />
          <div className="flex justify-center">
            <ConnectionStatus file={session.file} />
          </div>
          <ProfileMenu
            initials={initialsOf(session.user)}
            name={session.user}
            theme={theme}
            onTheme={setTheme}
            onSettings={() => {
              setAccount(true);
              setDetail(null);
              setElement(null);
            }}
            onSignOut={signOut}
          />
        </header>

        <TabBar tabs={TABS} active={account || element ? null : tab} onChange={goTab} />

        {/* Only while developing in a normal browser tab, where DevTools is not available */}
        {import.meta.env.DEV && !inDevtools && !element && (
          <button
            type="button"
            onClick={() => setElement(SAMPLE_ELEMENT)}
            className="cursor-pointer text-[11px] font-bold text-[var(--p1)]"
          >
            Try element example
          </button>
        )}

        {account ? (
          <Account
            user={session.user}
            file={session.file}
            theme={theme}
            onTheme={setTheme}
            onSignOut={signOut}
          />
        ) : element ? (
          <ElementScore el={element} onBack={() => setElement(null)} />
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
    </div>
  );
}