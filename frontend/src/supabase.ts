import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Set when the build had no Supabase settings. Throwing at import time used to leave
 * the DevTools panel completely blank, so the UI shows this message instead.
 */
export const supabaseConfigError: string | null =
  supabaseUrl && supabasePublishableKey
    ? null
    : "This build of Parity has no Supabase settings. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to frontend/.env, run npm run build, then reload the extension.";

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? "Supabase is not configured");
  }
  return supabase;
}
