require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

// The server still starts without Supabase so /health can report what is missing.
// Routes that need the database answer 503 with a clear message instead.
const missing = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter(
  (name) => !process.env[name]
);

const supabase =
  missing.length === 0
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

if (!supabase) {
  console.warn(
    `[parity] Supabase is not configured (missing ${missing.join(", ")}). ` +
      "Login, projects and history will return 503 until backend/.env is filled in."
  );
}

// Exports the client, or null when it is not configured (server.js checks for null).
module.exports = supabase;
