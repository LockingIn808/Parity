console.log("Parity background service worker started.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Parity installed.");
});

// The DevTools panel asks for this when chrome.identity is not available inside the panel.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "parity:auth" || sender.id !== chrome.runtime.id) {
    return false;
  }

  chrome.identity
    .launchWebAuthFlow({ url: message.url, interactive: true })
    .then((callbackUrl) =>
      sendResponse(
        callbackUrl
          ? { ok: true, callbackUrl }
          : { ok: false, error: "GitHub login was cancelled" }
      )
    )
    .catch((error) =>
      sendResponse({ ok: false, error: error?.message || "GitHub login failed" })
    );

  return true; // keep the channel open for the async reply
});
