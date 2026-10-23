import { supabase } from "./supabase";

export async function signInWithGitHub() {
  if (typeof chrome === "undefined" || !chrome.identity) {
    throw new Error("Chrome Identity API is unavailable");
  }

  const redirectTo = chrome.identity.getRedirectURL("supabase-auth");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Supabase did not return a GitHub login URL");
  }

  const callbackUrl = await chrome.identity.launchWebAuthFlow({
    url: data.url,
    interactive: true,
  });

  if (!callbackUrl) {
    throw new Error("GitHub login was cancelled");
  }

  const returnedUrl = new URL(callbackUrl);

  const oauthError =
    returnedUrl.searchParams.get("error_description") ||
    returnedUrl.searchParams.get("error");

  if (oauthError) {
    throw new Error(oauthError);
  }

  const code = returnedUrl.searchParams.get("code");

  if (!code) {
    throw new Error("No authorization code was returned");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    throw sessionError;
  }

  return sessionData.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}