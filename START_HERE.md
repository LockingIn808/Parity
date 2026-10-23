# Start Parity with Gemini

1. Use Node.js 20 or newer.
2. Open backend/.env in VS Code. Paste your Gemini key after GEMINI_API_KEY=. Save. Keep this file private.
3. From the Parity folder: cd backend, npm install, npx playwright install chromium, npm start.
4. Open http://127.0.0.1:3000 to confirm the server started. This root page does not run an AI request.

Default model: gemini-3.5-flash-lite. If your Google account has no quota for it, set GEMINI_MODEL to a supported text model with free quota in your AI Studio account, then restart. No automatic retries or paid-model fallback are configured.

For an existing project, replace backend/src/ai/explainResults.js only, then add GEMINI_API_KEY and GEMINI_MODEL to your own backend/.env. No new dependency is needed.

Run a real comparison through POST /api/compare (or the team's connected UI). aiStatus: completed confirms Gemini replied; aiStatus: unavailable includes aiError explaining missing keys, quotas, or request errors. Core comparison scores remain available when AI fails. Preview and Commit do not call Gemini.

This package does not add React UI, GitHub authentication or Figma URL parsing. See INTEGRATION.md for team integration. Automated Gemini tests mock the API. Your key and a real Google request have not been tested here.
