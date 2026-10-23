# Parity preview and commit MVP

This extends the supplied backend. React UI and GitHub login are not included in the uploaded project and are not implemented here. No changes have been sent to GitHub.

## Replace / run
Copy backend/src, backend/test, extension/panel/preview.js, extension/panel/panel.html and extension/manifest.json into your project. If your teammate has changed panel.html or manifest.json, merge the script tag and localhost host permission rather than replacing their files. Other supplied source files are unchanged.

From backend: npm install, then npx playwright install chromium, then npm start. Preserve your existing .env when copying updates; the supplied .env contains a blank key only. AI explanations now use GEMINI_API_KEY and optional GEMINI_MODEL (default gemini-3.5-flash-lite). A blank backend/.env is included; enter your own key. Node.js 20+ is required. No OpenAI key is needed. No additional packages were added. Test with: node --test test/*.test.js

## What is implemented
- /api/compare still takes websiteUrl and parsed figmaData (not a raw Figma URL). It now returns fixes with selector/property/value. Existing Figma parsing remains your teammate's responsibility.
- The browser analyzer now collects selectors and margin/padding. Figma must provide corresponding numeric margin/padding properties to compare spacing. x/y differences are not blindly converted into margins.
- Fixes cover colors, background colors, font size/weight, radius, margin and padding. These match Figma; they are not automatically accessibility improvements.
- Existing axe violations remain in the response. They are not all automatically fixable.
- POST /api/contrast with {foreground:'#000000',background:'#ffffff'} calculates an opaque color-pair contrast ratio. UI can use it to check reviewed color choices. It does not handle layered backgrounds or automatically resolve axe violations.
- Reviewed plans generate a new CSS file and import it from a selected React app entry JS/TS file. No AI rewrites or source mapping guesses.
- Preview injects the exact same CSS from the plan into the inspected page. Undo removes it; reload also removes it. Closing DevTools alone does NOT reliably undo it. The frontend should provide Undo and call it when appropriate.
- Commit writes the two reviewed files in one commit on a new parity/... branch. Original branch is unchanged. It does not deploy or open a pull request.

## Frontend hookup (DevTools panel)
Load panel/preview.js before your React bundle. It exposes window.ParityPreview.apply(plan) and .undo(). They return Promises. This API is only for a DevTools panel, not a normal React tab.

Use fetch from the extension panel to http://127.0.0.1:3000. Keep the backend bound to loopback. GitHub requests below require Authorization: Bearer <user GitHub token>. Integrate with the teammate's session handling; don't embed a token in source or expose it to the inspected webpage. GitHub authorization must grant read/write access to the selected repository. Login alone is insufficient.

1. Run the existing POST /api/compare and show scores, issues, and selectable fixes. Compare before applying a preview. Backend analyzes a separate browser: it does not share the inspected page's login/session, DOM state, viewport, or route state. Use a public demo page with matching viewport/state for this MVP.
2. GET /api/github/repositories?page=1 returns owner/name/defaultBranch/canPush. Fetch further pages if a page has 100 entries. Select a writable repo and branch. There is no branch-list UI/API yet; defaultBranch is enough for the demo or accept a branch name.
3. POST /api/github/files with {owner,repo,branch} lists relevant files. If truncated is true, do not assume the list is complete.
4. User selects the actual app entry file, e.g. src/main.jsx. It must support CSS imports (e.g. Vite React). Do not select an arbitrary component or server file. This MVP is not for Next.js global CSS rules, plain script tags, or every build system.
5. POST /api/github/plan with {owner,repo,branch,entryFile,websiteUrl,fixes}. websiteUrl must exactly match location.href in the inspected tab. Keep the returned plan including id, css, files, baseSha, expiresAt.
6. Preview button calls await window.ParityPreview.apply(plan). Undo calls await window.ParityPreview.undo(). Replacing a preview replaces its CSS. Handle rejected Promises visibly. Show plan.files before/after for source review. If selected fixes/repo/branch change, create and review a new plan.
7. After explicit user confirmation, Commit button POSTs /api/github/commit with {planId:plan.id,confirm:true}. Disable while pending. Display returned branch and commit URL. The server commits its stored files, not browser-supplied replacement files. Do not silently re-plan/retry a failed commit. Uncertain writes require checking the branch shown in the error.

Plans expire after 30 minutes and disappear on backend restart. Branch movement requires a new plan/review. In-memory plans are suitable for local demo use, not a shared hosted service.

## Accuracy limits and verification
Positional selectors depend on the exact DOM. Prefer stable IDs in the demo site. A selector that works in the inspected page may target a different element on another route, DOM state, or screen size. CSS overrides use !important and may affect every route importing the entry file. Check selector targets and collisions. Existing !important rules, CSP, shadow DOM and iframes can prevent parity between preview and build. Do not claim a preview was visually verified just because style injection returned successfully.

Test against your actual demo repo: compare a known incorrect button, generate a plan, inspect both file changes, preview and undo, commit to the new branch, then run that branch locally and verify appearance and axe results. Source build and accessibility re-scan are manual in this MVP; it does not guarantee accessibility compliance.

Automated tests cover fix filtering, invalid values, contrast, stored plan immutability, token isolation, confirmation, stale branches, one commit containing both files and duplicate submission rejection using a mocked GitHub API. No real GitHub write or end-to-end Chrome test has been performed.
