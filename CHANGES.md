# Integration changes

Base: `codespace-scaling-spoon-q7ppr6r4x65j394qr`. Reference branches (`main`, `frontend`, `backend`) were only read.

## Why the integration branch did not work

| Severity | Problem | Root cause | Fix |
|---|---|---|---|
| BLOCKER | Design scores were fake | `ElementScore` compared every element to hardcoded `SAMPLE_SPEC` (`lib/spec.ts`); the frontend never called `POST /compare/element`, so the chosen Figma frame was never used | New `components/DesignResult.tsx` calls the backend comparison |
| BLOCKER | Picking an element did nothing | `useSelectedElement` was changed to `await inspectedWindow.eval(...)`, but that API is callback-only and returns `undefined`, so the result was always discarded | Restored the callback form via `lib/devtools.ts` |
| BLOCKER | Panel could load blank | `supabase.ts` threw at import when `VITE_SUPABASE_*` were missing | Shows a readable configuration message instead |
| BLOCKER | Committed panel build pointed at one specific Codespace URL and contained the old code | Build output committed to git | Removed; placeholder tells you to `npm run build` |
| HIGH | Backend crashed at startup without Supabase env | `supabase.js` threw on import | Server starts; `/health` reports what is missing; DB routes return 503 with a message |
| HIGH | Sign-in could fail inside DevTools | DevTools extension pages may not get `chrome.identity` | Falls back to the background service worker for the GitHub window |
| HIGH | No live preview existed in the integrated UI | "Preview" only showed text; "Commit" toggled a checkmark | `lib/preview.ts`: temporary inline styles on the exact inspected element, with exact revert |
| HIGH | History was fake | Stored only in local extension storage; "Open" just renamed the header | History now comes from the `figma_projects` table and Open really reconnects |
| MEDIUM | AI call on every comparison | Compare route awaited Gemini (up to 30 s) | Unhooked (module and test kept) |
| MEDIUM | Asymmetric padding hidden | Padding was averaged (8/16 and 12/12 looked identical) | Per-side padding collected and compared |
| MEDIUM | Border radius never compared | Not collected from the page | Collected and scored under Sizing |
| MEDIUM | Float noise counted as mismatch | Exact numeric compare | Under 0.5px counts as equal |
| MEDIUM | A rejected commit-fix value broke the whole comparison | `commitFixesFromCss` threw inside the compare route | Made non-fatal; validator accepts 1–4 value padding |
| MEDIUM | Wrong Tailwind | `font-[Inter]` is ambiguous; weights not named | `font-['Inter']`, `font-semibold`, exact spacing tokens, else arbitrary values |
| LOW | Large responses | Every project response included the full cached node tree | `cached_properties` stays server-side |
| LOW | "Failed to fetch" errors | No network error handling | Explains backend URL / Codespaces port visibility |

## API contract (all routes need `Authorization: Bearer <Supabase access token>` except `/` and `/health`)

| Method & path | Body | Response |
|---|---|---|
| GET `/health` | none | `{status, supabase_configured, figma_configured}` |
| GET `/me` | none | `{id, email, username, avatar_url, provider}` |
| POST `/figma-projects` | `{file_url}` | project `{id, file_key, file_url, file_name, selected_frame_id, selected_frame_name, frames[], …}` (201 new / 200 existing) |
| GET `/figma-projects` | none | history: up to 20 projects without `frames`, newest `updated_at` first |
| GET `/figma-projects/:id` | none | project |
| POST `/figma-projects/:id/open` | none | project (marks it as recently used, no Figma call) **new** |
| GET `/figma-projects/:id/frames` | none | `frames[]` |
| PATCH `/figma-projects/:id/frame` | `{frame_id}` | project (fetches and caches that frame's layers) |
| GET `/figma-projects/:id/nodes` | none | `[{id, name, type, text, parent_id}]` layers of the selected frame **new** |
| POST `/figma-projects/:id/refresh` | none | project |
| DELETE `/figma-projects/:id` | none | 204 |
| POST `/compare/element` | `{project_id, element, figma_node_id?}` | `{matched_node, design_score, categories[], mismatches[], suggested_fixes[{property, css_property, current, expected, tailwind[]}], css_fix_rule, target_css_rule, tailwind_classes[], tailwind_fix_classes[], accessibility_*, commit_fixes[]}` |

`element` is what `lib/inspect.ts` collects: `tag, selector, text, fontFamily, fontSize, fontWeight, color, background, width, height, padding, paddingTop/Right/Bottom/Left, gap, borderRadius, parityId` plus accessibility fields.

## Files changed

Backend: `src/server.js`, `src/supabase.js`, `src/compare.js`, `src/fixes.js`, `src/changes/fixes.js`, `.env.example`, new `test/mvp.test.js`.

Extension: `manifest.json` (host permissions for any Codespace / Supabase project), `background/background.js` (sign-in fallback), `panel/` (stale build replaced by placeholder). Removed stale `parity-extension-test.zip`.

Frontend: `App.tsx`, `global.ts`, `supabase.ts`, `auth.ts`, `lib/api.ts`, `lib/inspect.ts`, `hooks/useSelectedElement.ts`, `pages/ElementScore.tsx`, `pages/FigmaLink.tsx`, `pages/DesignComparison.tsx`, `.env.example`, `.gitignore`; new `components/DesignResult.tsx`, `lib/devtools.ts`, `lib/preview.ts`, `lib/clipboard.ts`.

Kept but no longer used by the UI: `lib/spec.ts`, `lib/figma.ts#loadFigmaFile`, `backend/src/ai/explainResults.js`.

## Verification done so far

- Backend unit tests: 15/15 pass (`test/scoring`, `test/mvp`, `test/gemini`). `test/changes` needs `npm install` (express).
- Real route handlers exercised with stubbed Express/Supabase: history order and ownership, reopen, layer list, compare (auto and manual layer), no AI fields, 503 without Supabase.
- Frontend: all changed files type-check under `strict` + `noUnusedLocals` against stand-in type declarations.
- In-page scripts (collect, re-collect, apply, revert, removed element) run against a simulated DOM element.
- **Not yet verified:** `npm install`/`npm run build` with real packages, real Figma/Supabase calls, and the panel inside Chrome. Use the checklist in `SETUP.md` §5.
