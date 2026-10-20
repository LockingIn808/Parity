import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import TabBar from "./components/TabBar";
import ConnectionStatus from "./components/ConnectionStatus";
import ProfileMenu from "./components/ProfileMenu";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import logo from "./assets/ParityLogo.png";

import { TABS, type User as ParityUser } from "./global";
import { supabase } from "./supabase";
import { signInWithGitHub, signOut } from "./auth";

function getParityUser(user: SupabaseUser): ParityUser {
  return {
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      user.email ||
      "GitHub user",
    photoUrl: user.user_metadata?.avatar_url || undefined,
  };
}

export default function App() {
  const [tab, setTab] = useState("figma");
  const [figmaLink, setFigmaLink] = useState("");
  const [user, setUser] = useState<ParityUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;

      setUser(sessionUser ? getParityUser(sessionUser) : null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? getParityUser(session.user) : null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError("");

    try {
      await signInWithGitHub();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "GitHub sign in failed"
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError("");

    try {
      await signOut();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Sign out failed"
      );
    }
  };

  const handleConnected = (url: string) => {
    setFigmaLink(url);
    setTab("design");
  };

  return (
    <div className="parity-bg mx-auto w-full max-w-[560px] space-y-3 rounded-2xl p-4">
      <header className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2">
        <img
          src={logo}
          alt="Parity logo"
          className="h-8 w-8 object-contain"
        />

        <div className="flex justify-center">
          <ConnectionStatus link={figmaLink} />
        </div>

        <div className="flex justify-end">
          {authLoading ? (
            <span className="text-xs text-slate-500">Loading...</span>
          ) : user ? (
            <ProfileMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="cursor-pointer rounded-xl bg-[#5748CC] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
          {authError}
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "figma" && <FigmaLink onConnected={handleConnected} />}
      {tab === "design" && <DesignComparison />}
      {tab === "accessibility" && <AccessibilityScore />}
    </div>
  );
}