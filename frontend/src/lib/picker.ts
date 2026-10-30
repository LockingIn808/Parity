import { evalInPage } from "./devtools";
import { COLLECT_FN, type ElementSnapshot } from "./inspect";

/**
 * In-panel element picker: outlines whatever the mouse is over on the inspected page and
 * captures the next click (the page itself never receives that click). Esc cancels.
 * The panel polls for the result because DevTools pages can't receive events from the page.
 * Plain string (no backticks, dollar-brace or backslashes) so the bundler leaves it alone.
 */
const START = `(function () {
  var store = window.__parity || (window.__parity = { els: {}, orig: {}, n: 0 });
  if (store.picker) store.picker.stop();
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #6F47DB;background:rgba(111,71,219,.12);border-radius:3px;display:none;box-sizing:border-box';
  var tip = document.createElement('div');
  tip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#3A1F78;color:#fff;font:600 11px/1.6 system-ui,sans-serif;padding:1px 6px;border-radius:4px;display:none;white-space:nowrap';
  document.documentElement.appendChild(box);
  document.documentElement.appendChild(tip);
  function target(e) {
    var t = (e.composedPath && e.composedPath()[0]) || e.target;
    if (t && t.nodeType !== 1) t = t.parentElement;
    return t;
  }
  function move(e) {
    var t = target(e);
    if (!t || t === box || t === tip) return;
    var r = t.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = r.left + 'px'; box.style.top = r.top + 'px';
    box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    var label = String(t.tagName).toLowerCase() + ' ' + Math.round(r.width) + ' x ' + Math.round(r.height);
    tip.textContent = label;
    tip.style.display = 'block';
    tip.style.left = Math.max(0, r.left) + 'px';
    tip.style.top = (r.top > 22 ? r.top - 20 : r.bottom + 2) + 'px';
  }
  function block(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  var swallowed = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'auxclick', 'contextmenu'];
  function cleanup() {
    window.removeEventListener('mousemove', move, true);
    window.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key, true);
    swallowed.forEach(function (type) { window.removeEventListener(type, block, true); });
    box.remove(); tip.remove();
    store.picker = null;
  }
  function click(e) { block(e); store.picked = target(e); store.pickState = 'picked'; cleanup(); }
  function key(e) { if (e.key === 'Escape') { block(e); store.pickState = 'cancelled'; cleanup(); } }
  window.addEventListener('mousemove', move, true);
  window.addEventListener('click', click, true);
  window.addEventListener('keydown', key, true);
  swallowed.forEach(function (type) { window.addEventListener(type, block, true); });
  store.picked = null;
  store.pickState = 'picking';
  store.picker = { stop: function () { if (store.pickState === 'picking') store.pickState = 'cancelled'; cleanup(); } };
  return true;
})()`;

const POLL = `(function () {
  var store = window.__parity;
  if (!store || !store.pickState) return { state: 'cancelled' };
  if (store.pickState !== 'picked') return { state: store.pickState };
  var el = store.picked;
  store.picked = null;
  store.pickState = 'done';
  return { state: 'picked', snap: ${COLLECT_FN}(el) };
})()`;

const STOP = `(function () { var s = window.__parity; if (s && s.picker) s.picker.stop(); return true; })()`;

type PollResult = { state: string; snap?: ElementSnapshot | null };

/** Resolves with the clicked element, or null if picking was cancelled (Esc, page reload, Cancel). */
export async function pickElement(signal: { cancelled: boolean }): Promise<ElementSnapshot | null> {
  await evalInPage<boolean>(START);
  const started = Date.now();
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (signal.cancelled || Date.now() - started > 120000) {
      await evalInPage(STOP).catch(() => undefined);
      return null;
    }
    // A navigation wipes window.__parity, which reads as cancelled.
    const result = await evalInPage<PollResult>(POLL).catch(() => ({ state: "cancelled" }) as PollResult);
    if (result.state === "picked") return result.snap ?? null;
    if (result.state !== "picking") return null;
  }
}

export function stopPicking(): Promise<unknown> {
  return evalInPage(STOP).catch(() => undefined);
}
