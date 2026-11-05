/**
 * The GitHub token from sign-in (Supabase hands it over once, as provider_token, and does not keep it
 * after refreshing its own session). Stored only in this extension's local storage and sent only to
 * the Parity backend, which uses it for Commit / Revert. Cleared on sign-out.
 */
const KEY = "parity-github-token";
const area = typeof chrome !== "undefined" ? chrome.storage?.local : undefined;

export async function getGithubToken(): Promise<string | null> {
  try {
    if (area) return ((await area.get(KEY))[KEY] as string | undefined) ?? null;
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setGithubToken(token: string | null): Promise<void> {
  try {
    if (area) {
      if (token) await area.set({ [KEY]: token });
      else await area.remove(KEY);
    } else if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* best effort */
  }
}
