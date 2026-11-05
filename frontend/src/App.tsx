import { useEffect, useState } from "react";
import { TABS, type Screen, type Session, type TabId, type Theme } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSelectedElement } from "./hooks/useSelectedElement";
import { parseFigma } from "./lib/figma";
import { initialsOf } from "./lib/github";
import type { ElementSnapshot } from "./lib/inspect";
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
import CommitSetup from "./components/CommitSetup";
import GithubLogin from "./pages/GithubLogin";
import Connecting from "./pages/Connecting";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison, { type Loadable } from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import ComponentDetail from "./pages/ComponentDetail";
import { scanPage, type PageScan } from "./lib/scan";
import { comparePageDesign, type PageCompareResult } from "./lib/api";
import { scoreAccessibilityPage } from "./lib/score";
import { accessibilityPageReport, designPageReport } from "./lib/reports";
import { useLiveDesign } from "./hooks/useLiveDesign";
import { useAsk } from "./hooks/useAsk";
import type { Report } from "./types/design";
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
  const [account, setAccount] = useState(false); // true = the Settings page is showing
  const [element, setElement] = useState<ElementSnapshot | null>(null); // selected on the website
  const [pickCount, setPickCount] = useState(0); // remounts the result when the same element is picked again
  const [figmaError, setFigmaError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  // The connected Figma project (with its frame list). Kept in memory; session.projectId is what persists.
  const [project, setProject] = useState<FigmaProject | null>(null);
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "contrast"
  const [booted, setBooted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // One page scan feeds both overviews; it is refreshed each time an overview opens.
  const [scan, setScan] = useState<Loadable<PageScan>>({ status: "idle" });
  const [pageDesign, setPageDesign] = useState<Loadable<PageCompareResult>>({ status: "idle" });

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

  const inDevtools = useSelectedElement((snap) => {
    if (screen === "app") showElement(snap);
  });

  // Apply the theme to <html> so index.css can switch its colors.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const runScan = () => {
    setScan({ status: "loading" });
    setPageDesign({ status: "idle" });
    scanPage()
      .then((data) => setScan({ status: "done", data }))
      .catch((error) => setScan({ status: "error", error: message(error, "Could not scan this page.") }));
  };

  // Scan whenever an overview opens (first visit, back from an element, back from Figma Link),
  // so the scores always describe the page as it is now.
  const pageView = screen === "app" && !account && !element && (tab === "design" || tab === "accessibility");
  useEffect(() => {
    if (pageView && inDevtools) runScan();
  }, [pageView, inDevtools]);

  // Compare the scan with the Figma frame once both exist.
  useEffect(() => {
    if (scan.status !== "done" || !session.projectId || pageDesign.status !== "idle") return;
    if (scan.data.elements.length === 0) {
      setPageDesign({ status: "error", error: "No visible text, links, buttons or images were found on this page." });
      return;
    }
    setPageDesign({ status: "loading" });
    comparePageDesign(session.projectId, scan.data.elements)
      .then((data) => setPageDesign({ status: "done", data }))
      .catch((error) => setPageDesign({ status: "error", error: message(error, "Could not compare the page with Figma.") }));
  }, [scan, session.projectId, pageDesign.status]);

  // A different Figma frame means a different page score.
  useEffect(() => {
    setPageDesign({ status: "idle" });
  }, [session.projectId, session.frame]);

  // The inspected page navigated or reloaded: old scans and element handles are gone.
  useEffect(() => {
    if (!inDevtools) return;
    const onNavigated = () => {
      setScan({ status: "idle" });
      setPageDesign({ status: "idle" });
      setElement(null);
    };
    chrome.devtools.network.onNavigated.addListener(onNavigated);
    return () => chrome.devtools.network.onNavigated.removeListener(onNavigated);
  }, [inDevtools]);

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
    setDetail(null);
    setTab(t);
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
      setScreen("landing");
      setTab("figma");
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


  const live = useLiveDesign();

  const pageAccessibility = scan.status === "done" ? scoreAccessibilityPage(scan.data.elements) : null;

  const designAsk = useAsk(() => ({
    kind: "whole-page design comparison against Figma",
    frame: session.frame,
    page_score_percent: pageDesign.status === "done" ? pageDesign.data.page_score : null,
    compared_elements: pageDesign.status === "done" ? pageDesign.data.compared : null,
    scanned_elements: pageDesign.status === "done" ? pageDesign.data.scanned : null,
    worst_elements: pageDesign.status === "done"
      ? pageDesign.data.elements.slice(0, 12).map((e) => ({ element: e.selector, text: e.text, score: e.score, differences: e.fixes }))
      : [],
  }));
  const accessibilityAsk = useAsk(() => ({
    kind: "whole-page accessibility check",
    score_percent: pageAccessibility?.result.total ?? null,
    checks: (pageAccessibility?.result.parts ?? []).map((p) => ({ name: p.name, note: p.note })),
    worst_elements: (pageAccessibility?.issues ?? []).slice(0, 12).map((i) => ({
      element: i.snap.selector,
      text: i.snap.text,
      score: i.score,
      problems: i.problems.map((p) => `${p.name}: ${p.fix || p.site}`),
    })),
  }));

  const designReport: Loadable<Report> =
    pageDesign.status === "done"
      ? { status: "done", data: designPageReport(pageDesign.data, live, (q) => void designAsk.ask(q)) }
      : pageDesign.status === "error"
        ? pageDesign
        : scan.status === "error"
          ? scan
          : { status: "loading" };
  const accessibilityReport: Loadable<Report> =
    scan.status === "done" && pageAccessibility
      ? { status: "done", data: accessibilityPageReport(pageAccessibility, (q) => void accessibilityAsk.ask(q)) }
      : scan.status === "error"
        ? scan
        : { status: "loading" };

  const shown = tab === "design" ? designReport : accessibilityReport;
  const detailReport = detail && shown.status === "done" ? shown.data : null;

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
              setElement(null);
            }}
            onSignOut={signOut}
          />
        </header>

        <TabBar tabs={TABS} active={account ? null : tab} onChange={pickTab} />

        {/* Tells you how to select an element. Hidden once one is selected. */}
        {inDevtools && !account && !element && tab !== "figma" && !notice && (
          <p className="px-1 text-[11px] text-[var(--muted)]">
            Select an element on the page with Chrome’s inspect tool (the arrow icon at the top left of DevTools),
            then come back to this tab to see its scores.
          </p>
        )}

        {notice && !account && tab !== "figma" && (
          <p role="status" className="px-1 text-[11px] font-semibold text-[#8A5200]">
            {notice}
          </p>
        )}

        {live.error && !account && tab !== "figma" && (
          <p role="alert" className="px-1 text-[11px] font-semibold text-[var(--err)]">
            {live.error}{" "}
            <button type="button" className="cursor-pointer underline" onClick={live.clearError}>
              Dismiss
            </button>
          </p>
        )}

        {live.lastLink && !account && tab !== "figma" && !live.error && (
          <p className="px-1 text-[11px] text-[var(--muted)]">
            Commits go to the <b>parity/fixes</b> branch{live.target ? ` of ${live.target.owner}/${live.target.repo}` : ""} ·{" "}
            <a href={live.lastLink} target="_blank" rel="noreferrer" className="font-bold text-[var(--p1)]">
              view on GitHub ↗
            </a>{" "}
            ·{" "}
            <button type="button" className="cursor-pointer font-bold text-[var(--p1)]" onClick={live.openSetup}>
              settings
            </button>
          </p>
        )}

        {live.setupOpen && !account && tab !== "figma" && (
          <CommitSetup initial={live.target} onSave={live.saveTarget} onCancel={live.cancelSetup} />
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
            live={live}
            onGoFigma={() => goTab("figma")}
            onBack={() => setElement(null)}
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
        ) : detailReport ? (
          <ComponentDetail report={detailReport} partId={detail as string} onBack={() => setDetail(null)} />
        ) : tab === "design" ? (
          <DesignComparison
            report={designReport}
            connected={Boolean(session.projectId)}
            onSelect={setDetail}
            onGoFigma={() => goTab("figma")}
            ask={{ items: designAsk.items, busy: designAsk.busy, onAsk: (q) => void designAsk.ask(q) }}
          />
        ) : (
          <AccessibilityScore
            report={accessibilityReport}
            onSelect={setDetail}
            ask={{ items: accessibilityAsk.items, busy: accessibilityAsk.busy, onAsk: (q) => void accessibilityAsk.ask(q) }}
          />
        )}
      </div>
    </div>
  );
}