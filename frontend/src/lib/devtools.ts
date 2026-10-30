/** True inside the Parity DevTools panel; false in `npm run dev` or a normal tab. */
export const inDevtools = (): boolean =>
  typeof chrome !== "undefined" && !!chrome.devtools?.inspectedWindow;

/**
 * chrome.devtools.inspectedWindow.eval is callback-only (it does not return a Promise),
 * so `await eval(code)` resolves to undefined. This wraps the callback form.
 */
export function evalInPage<T>(code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!inDevtools()) {
      reject(new Error("Open Parity inside Chrome DevTools to inspect the page."));
      return;
    }
    chrome.devtools.inspectedWindow.eval(code, (result: unknown, info) => {
      if (info && (info.isError || info.isException)) {
        reject(new Error(info.description || info.value || "Could not run code in the inspected page."));
        return;
      }
      resolve(result as T);
    });
  });
}
