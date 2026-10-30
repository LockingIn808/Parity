import { useEffect, useState } from "react";
import { TABS, type Screen, type Session, type TabId, type Theme } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSelectedElement } from "./hooks/useSelectedElement";
import { parseFigma } from "./lib/figma";
import { initialsOf } from "./lib/github";
import { collectById, type ElementSnapshot } from "./lib/inspect";
import { evalInPage } from "./lib/devtools";
import { signInWithGitHub, signOut as signOutAuth } from "./auth";
import { supabaseConfigError } from "./supabase";
import {
  connectFigmaProject,
  getMe,
  openFigmaProject,
  selectFigmaFrame,
  type FigmaFrame,
  type FigmaHistoryItem,
  type FigmaProject,
} from "./lib/api";
import LandingPage from "./components/LandingPage";
import ConnectionStatus from "./components/ConnectionStatus";
import ProfileMenu from "./components/ProfileMenu";
import TabBar from "./components/TabBar";
import PickBar from "./components/PickBar";
import GithubLogin from "./pages/GithubLogin";
import Connecting from "./pages/Connecting";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison, { type ComparedElement } from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import ComponentDetail from "./pages/ComponentDetail";
import ElementScore from "./pages/ElementScore";
import Account from "./pages/Account";
import mark from "./assets/mark.png";

const EMPTY: Session = { user: "", file: "", frame: "", url: "", projectId: null };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function App() {
  const [session, setSession, ready] = usePersistentState<Session>("parity-session", EMPTY);
  const [theme, setTheme, themeReady] = usePersistentState<Theme>("parity-theme", "light");
  const [screen, setScreen] = useState<Screen>("landing");
  const [tab, setTab] = useState<TabId>("figma");
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "contrast"
  const [account, setAccount] = useState(false); // true = the Settings page is showing
  const [element, setElement] = useState<ElementSnapshot | null>(null); // selected on the website
  const [pickCount, setPickCount] = useState(0); // remounts the result when the same element is picked again
  const [figmaError, setFigmaError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  // The connected Figma project (with its frame list). Kept in memory; session.projectId is what persists.
  const [project, setProject] = useState<FigmaProject | null>(null);
  const [compared, setCompared] = useState<ComparedElement[]>([]);
  const [booted, setBooted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // An element was picked (Pick element button, inspect arrow or Elements panel).
  const showElement = (snap: ElementSnapshot) => {
    if (snap.invisible) {
      setNotice(`<${snap.tag}> isn’t visible on the page, so there is nothing to compare. Pick something you can see.`);
      return;
    }
    setNotice(null);
    setElement(snap);
    setPickCount((n) => n + 1);
    setAccount(false);
    setDetail(null);
    setTab((t) => (t === "figma" ? "design" : t));
  };

  // Reopen from "Compared this session": re-read it, since previews may have changed it.
  const reopen = (snap: ElementSnapshot) => {
    evalInPage<ElementSnapshot | null>(collectById(snap.parityId))
      .then((fresh) => {
        if (fresh) showElement(fresh);
        else setNotice("That element is no longer on the page (the page may have reloaded). Pick it again.");
      })
      .catch(() => showElement(snap));
  };

  const inDevtools = useSelectedElement((snap) => {
    if (screen === "app") showElement(snap);
  });

  // Apply the theme to <html> so index.css can switch its colors.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Returning users skip the landing page and get their last project's frame list back.
  useEffect(() => {
    if (!ready || booted) return;
    setBooted(true);
    if (!session.user) return;
    setScreen("app");
    setTab(session.projectId ? "design" : "figma");
    if (session.projectId) {
      openFigmaProject(session.projectId)
        .then(setProject)
        .catch((error) => {
          console.warn("[parity] could not restore the last Figma project:", error);
        });
    }
  }, [ready, booted, session]);

  const goTab = (t: TabId) => {
    setNotice(null);
    setTab(t);
    setDetail(null);
    setAccount(false);
    setElement(null);
    setFigmaError(null);
  };

  // With an element selected, Design/Accessibility switch views but keep the element.
  const pickTab = (t: TabId) => {
    if (element && t !== "figma") {
      setTab(t);
      setAccount(false);
      return;
    }
    goTab(t);
  };

  const signIn = async () => {
    await signInWithGitHub();
    const me = await getMe();
    const user = me.username || me.email || "GitHub user";
    setSession((s) => ({ ...s, user }));
    setScreen("app");
    goTab("figma");
  };

  const signOut = async () => {
    try {
      await signOutAuth();
    } catch (error) {
      console.warn("[parity] sign-out:", error);
    } finally {
      setSession(EMPTY);
      setProject(null);
      setCompared([]);
      setScreen("landing");
      setTab("figma");
      setDetail(null);
      setAccount(false);
      setElement(null);
    }
  };

  /** A project came back from the backend: remember it, and finish if a frame is already chosen. */
  const adoptProject = (next: FigmaProject) => {
    setProject(next);
    setSession((s) => ({
      ...s,
      url: next.file_url,
      file: next.file_name || "Figma design",
      frame: next.selected_frame_name || "",
      projectId: next.selected_frame_id ? next.id : null,
    }));

    if (next.selected_frame_id) {
      setLoaded(true); // Connecting screen finishes and opens the Design tab
      return;
    }
    if (!next.frames?.length) {
      throw new Error("Parity connected to the Figma file, but it has no top-level frames to compare against.");
    }
    setScreen("app");
    setTab("figma"); // the frame picker is shown there
  };

  const runConnecting = async (work: () => Promise<void>, fallback: string) => {
    setFigmaError(null);
    setLoaded(false);
    setElement(null);
    setScreen("connecting");
    try {
      await work();
    } catch (error) {
      console.error("[parity]", error);
      setScreen("app");
      setTab("figma");
      setFigmaError(message(error, fallback));
    }
  };

  const connect = (url: string) => {
    const cleanUrl = url.trim();
    setSession((s) => ({ ...s, url: cleanUrl }));
    if (!parseFigma(cleanUrl)) {
      setFigmaError("That doesn’t look like a Figma file link. It should look like figma.com/design/… or figma.com/file/…");
      return;
    }
    void runConnecting(
      async () => adoptProject(await connectFigmaProject(cleanUrl)),
      "Could not connect to the Figma file. Check the URL and that the backend’s Figma token can open it."
    );
  };

  const chooseFrame = (frame: FigmaFrame) => {
    if (!project) return;
    void runConnecting(
      async () => adoptProject(await selectFigmaFrame(project.id, frame.id)),
      "Could not load that Figma frame."
    );
  };

  const openHistory = (item: FigmaHistoryItem) => {
    void runConnecting(
      async () => adoptProject(await openFigmaProject(item.id)),
      "Could not reopen that Figma file."
    );
  };

  const recordScore = (snap: ElementSnapshot, score: number) =>
    setCompared((list) =>
      [{ selector: snap.selector, score, snap }, ...list.filter((x) => x.snap.parityId !== snap.parityId)].slice(0, 8)
    );

  if (!ready || !themeReady) return null; // wait for saved state so nothing flashes

  if (supabaseConfigError) {
    return (
      <div className="parity-bg parity-dashboard">
        <div className="mx-auto max-w-[560px] p-4">
          <section role="alert" className="rounded-2xl bg-[var(--card)] p-4 text-xs text-[var(--ink)]">
            <h1 className="mb-1 text-sm font-bold">Parity isn’t configured yet</h1>
            {supabaseConfigError}
          </section>
        </div>
      </div>
    );
  }

  if (screen === "landing") return <LandingPage onGithub={() => setScreen("githubLogin")} />;
  if (screen === "githubLogin") {
    return (
      <GithubLogin
        onBack={() => setScreen("landing")}
        onSubmit={signIn}
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
    <div className="parity-bg parity-dashboard">
      <div className="parity-inner mx-auto w-full max-w-[560px] space-y-3 p-4">
        <header className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
          <img
            src={mark}
            alt="Parity"
            className="h-8 w-8 rounded-lg object-contain dark:bg-[#ECE7FF] dark:p-1"
          />
          <div className="flex justify-center">
            <ConnectionStatus file={session.projectId ? session.file : ""} />
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

        <TabBar tabs={TABS} active={account ? null : tab} onChange={pickTab} />

        {inDevtools && !account && tab !== "figma" && <PickBar onPicked={showElement} />}

        {notice && !account && tab !== "figma" && (
          <p role="status" className="rounded-xl bg-[#FFF1DC] px-3 py-2 text-[11px] font-semibold text-[#8A5200]">
            {notice}
          </p>
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
          <ElementScore
            key={`${element.parityId}-${pickCount}`}
            el={element}
            tab={tab === "accessibility" ? "accessibility" : "design"}
            projectId={session.projectId}
            onGoFigma={() => goTab("figma")}
            onBack={() => setElement(null)}
            onScored={(score) => recordScore(element, score)}
          />
        ) : tab === "figma" ? (
          <FigmaLink
            url={session.url}
            error={figmaError}
            project={project}
            onConnect={connect}
            onSelectFrame={chooseFrame}
            onOpenHistory={openHistory}
          />
        ) : detail ? (
          <ComponentDetail report={tab} partId={detail} onBack={() => setDetail(null)} />
        ) : tab === "design" ? (
          <DesignComparison
            file={session.file}
            frame={session.frame ?? ""}
            connected={Boolean(session.projectId)}
            inDevtools={inDevtools}
            recent={compared}
            onOpen={reopen}
            onGoFigma={() => goTab("figma")}
          />
        ) : (
          <AccessibilityScore onSelect={setDetail} />
        )}
      </div>
    </div>
  );
}