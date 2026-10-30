# Parity: setup, keys, and end-to-end test

This branch integrates the `frontend` and `backend` work into one working MVP.
Read this top to bottom once; it takes about 20 minutes the first time.

## 1. Where every key goes

There are exactly two env files. Neither is committed (both are git-ignored).

### `backend/.env` (secret, server only)

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Where to get it | Secret? |
|---|---|---|---|
| `SUPABASE_URL` | Yes | Supabase dashboard → Project Settings → API → Project URL | No |
| `SUPABASE_SECRET_KEY` | Yes | Supabase → Project Settings → API Keys → **secret** key (`sb_secret_…`, or the legacy `service_role` key) | **Yes, never put it in the frontend** |
| `FIGMA_ACCESS_TOKEN` | Yes | Figma → Settings → Security → Personal access tokens → Generate (scope: File content, read-only) | **Yes** |
| `PORT` | No | Defaults to `3000` | No |
| `CORS_ORIGINS` | No | Leave blank. Extension and localhost origins are always allowed | No |

| `GEMINI_API_KEY` | No | Google AI Studio → aistudio.google.com/apikey. Powers **Explain**, **Why?** and the **Ask Parity** box. Without it everything else still works | **Yes** |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.5-flash-lite` | No |

### `frontend/.env` (public, baked into the extension at build time)

Copy `frontend/.env.example` to `frontend/.env` and fill in:

| Variable | Required | Where to get it | Secret? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Same Project URL as above | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase → API Keys → **publishable** key (`sb_publishable_…`, or the legacy `anon` key) | No (designed to be public) |
| `VITE_API_BASE_URL` | Yes | Local: `http://localhost:3000`. Codespaces: `https://<codespace-name>-3000.app.github.dev` (copy it from the Ports tab) | No |

**Anything starting with `VITE_` ends up inside the extension.** Never put the secret key or the Figma token there.
After changing `frontend/.env` you must run `npm run build` again and reload the extension.

## 2. One-time Supabase setup

1. **Table.** Supabase → SQL Editor → paste all of `backend/supabase/migrations/001_initial_schema.sql` → Run.
   It is safe to run again if the table already exists. No other schema is needed: history uses the same
   `figma_projects` table (its `updated_at` column is the "last used" time).
2. **GitHub login.** Supabase → Authentication → Sign In / Providers → GitHub → enable.
   It needs a GitHub OAuth App (github.com → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: anything, e.g. your repo URL
   - Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows this exact URL on the GitHub provider page)
   - Paste the OAuth App's Client ID and Client Secret into Supabase.
3. **Extension redirect URL.** Load the extension first (section 4) to learn its ID, then
   Supabase → Authentication → URL Configuration → Redirect URLs → add
   `https://<extension-id>.chromiumapp.org/supabase-auth`.
   The ID of an unpacked extension stays the same as long as you load it from the same folder.
   If a teammate loads it from a different folder, they get a different ID and need their own entry.

## 3. Run it

### Backend

```bash
cd backend
npm install
npm start
```

You should see `Parity backend running on port 3000`. Check `http://localhost:3000/health`. It should show
`"supabase_configured": true` and `"figma_configured": true`. If either is `false`, `backend/.env` is incomplete.

**In Codespaces:** open the **Ports** tab, right-click port 3000 → Port Visibility → **Public**.
A private port makes every request fail (GitHub answers with a login page). Open the forwarded
`…-3000.app.github.dev/health` URL in your browser to confirm, then put that origin (no trailing slash,
no `/health`) in `VITE_API_BASE_URL`. A Codespace's URL stays the same while it exists; if you create a new
Codespace, update the URL and rebuild.

### Frontend / extension build

```bash
cd frontend
npm install
npm run build
```

`npm run build` type-checks and then writes the panel into `extension/panel/` (replacing the
"not built yet" placeholder). If you build inside a Codespace, download the `extension` folder to your computer
(right-click it in the Explorer → Download) because Chrome needs it on your local disk.

### Backend tests

```bash
cd backend
npm test
```

## 4. Load the extension in Chrome

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose the **`extension`** folder (the one containing `manifest.json`).
3. Copy the extension ID shown on its card and do step 2.3 above.
4. After every rebuild, click the reload ↻ icon on the Parity card, then close and reopen DevTools.

## 5. Full test checklist

Use a page you control (for example a local Vite app) plus a Figma file the token's account can open.

1. Open the page → DevTools (F12) → **Parity** tab (it may be under the `»` overflow).
2. Landing page → **Sign in with GitHub** → GitHub window → you land on the Figma Link tab.
3. Paste a Figma file URL → **Connect Design**.
   - URL with `?node-id=` of a top-level frame: goes straight to the Design tab.
   - Otherwise: the **Select a Figma Frame** list appears → pick one.
4. **Recent Figma files** now lists the file with its frame and "just now".
5. Click **⌖ Pick element** in the Parity tab, hover the page (elements get outlined) and click one. Chrome's inspect arrow
   or the Elements panel also work. Parity shows on the Design tab:
   - Design Fidelity score and pie chart
   - "Compared with Figma layer …" → **Change** lets you pick the exact layer by hand
   - By category: Current vs Figma for Fonts / Color / Spacing / Sizing
6. **Apply** a fix → the page changes immediately, the row shows PREVIEWING, and the score goes up.
   **Revert** puts the original back. **Apply all** / **Revert all** work too. Reloading the page clears all previews.
7. **Code** → CSS and Tailwind for the fixes → **Copy**. "All Figma values" shows the full target style.
8. **✦ Ask Parity**: click **Explain these results**, click **Why?** on a fix, or type a question. Answers need `GEMINI_API_KEY`.
9. Accessibility tab with the same element → local accessibility score and its own Ask box.
10. Go back to Figma Link → click **Open** on an older history entry → it reconnects without re-entering the URL.
11. Close DevTools and reopen it → you are still signed in and the last project is restored.

## 6. If something fails

| What you see | Cause |
|---|---|
| "Parity isn't configured yet" | `frontend/.env` missing values at build time → fill in, rebuild, reload |
| "Panel has not been built yet" | Run `npm run build` in `frontend/` |
| "Could not reach the Parity backend at …" | Backend not running, wrong `VITE_API_BASE_URL`, or Codespaces port not Public |
| "…Supabase is not configured" (503) | `backend/.env` missing Supabase values → restart backend after fixing |
| "FIGMA_ACCESS_TOKEN is not configured" | Add the token to `backend/.env`, restart |
| "Figma rejected the request…" | Token invalid, or the token's Figma account can't open that file |
| GitHub window says redirect URL not allowed | Step 2.3: extension redirect URL missing in Supabase |
| Selecting elements does nothing | Make sure you are on the Figma-connected Design tab, then click a different element in the Elements panel |

## 7. Known limits (honest list)

- Matching starts automatic (text, size, font, colour); use **Change** to pick the layer by hand when it guesses wrong.
  A Figma frame with a single text layer inside (a typical button) is compared as one element: box styles from the frame,
  typography from the text.
- Compared today: font family, size, weight (shown as a fix but, per the existing team test, not counted in the score),
  text colour, background, padding (per side), gap, width, height, border radius. Not yet: line-height,
  letter-spacing, borders, margins.
- Figma colours ignore fill opacity; gradients/images are not compared.
- The generated CSS selector is a best guess (tag + up to two classes); check it targets the right element.
- Tailwind named classes assume a 16px root font size; everything else uses arbitrary values.
- The Accessibility overview (before picking an element) and its detail pages still show the team's sample data.
- The GitHub commit routes (`/api/github/*`) from the backend branch are still in the backend but have no UI.
