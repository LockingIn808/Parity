import { requireSupabase } from "./supabase";

const REDIRECT_PATH = "supabase-auth";

function redirectUrl(): string {
  if (chrome.identity?.getRedirectURL) {
    return chrome.identity.getRedirectURL(REDIRECT_PATH);
  }
  // Same value getRedirectURL returns; must be listed in Supabase Auth -> URL Configuration -> Redirect URLs.
  return `https://${chrome.runtime.id}.chromiumapp.org/${REDIRECT_PATH}`;
}

/**
 * DevTools panels may not get chrome.identity, so when it is missing the
 * background service worker opens the GitHub window and sends back the callback URL.
 */
async function launchAuthWindow(url: string): Promise<string> {
  if (chrome.identity?.launchWebAuthFlow) {
    const result = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
    if (!result) throw new Error("GitHub login was cancelled");
    return result;
  }

  const reply = (await chrome.runtime.sendMessage({ type: "parity:auth", url })) as
    | { ok: true; callbackUrl: string }
    | { ok: false; error: string }
    | undefined;

  if (!reply) {
    throw new Error("The Parity background worker did not respond. Reload the extension and try again.");
  }
  if (!reply.ok) throw new Error(reply.error);
  return reply.callbackUrl;
}

export async function signInWithGitHub() {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) {
    throw new Error("Sign-in only works inside the Parity Chrome extension.");
  }

  const supabase = requireSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: redirectUrl(), skipBrowserRedirect: true },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Supabase did not return a GitHub login URL");

  const returnedUrl = new URL(await launchAuthWindow(data.url));

  const oauthError =
    returnedUrl.searchParams.get("error_description") || returnedUrl.searchParams.get("error");
  if (oauthError) throw new Error(oauthError);

  const code = returnedUrl.searchParams.get("code");
  if (!code) throw new Error("No authorization code was returned");

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;

  return sessionData.session;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
