import { COLLECT } from "./inspect";

/** Same read-out as COLLECT, but for the element we picked ourselves instead of $0. */
export const COLLECT_PICKED = COLLECT.replace(/\(\$0\)\s*$/, "(window.__parityPicked)");

/** Installs the hover highlight + click catcher in the inspected page. */
export const PICK_START = `(function () {
  var W = window;
  if (W.__parityCleanup) { try { W.__parityCleanup(); } catch (e) {} }
  W.__parityState = 'picking';
  W.__parityPicked = null;
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;box-sizing:border-box;border:2px solid #7C5CE8;background:rgba(124,92,232,.2);border-radius:3px';
  var tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;left:-2px;bottom:100%;margin-bottom:2px;padding:2px 6px;font:600 11px system-ui,sans-serif;color:#fff;background:#5A32C6;border-radius:4px;white-space:nowrap';
  box.appendChild(tip);
  var css = document.createElement('style');
  css.textContent = '* { cursor: crosshair !important; }';
  document.documentElement.appendChild(box);
  document.documentElement.appendChild(css);
  var current = null;
  var BLOCK = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'contextmenu'];
  function label(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(' ')[0];
    return s;
  }
  function block(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
  function move(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || el === tip) return;
    current = el;
    var r = el.getBoundingClientRect();
    box.style.left = r.left + 'px';
    box.style.top = r.top + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
    tip.textContent = label(el);
  }
  function click(e) {
    block(e);
    if (current && current !== document.documentElement && current !== document.body) {
      W.__parityPicked = current;
      W.__parityState = 'done';
      cleanup();
    }
  }
  function key(e) {
    if (e.key === 'Escape') { block(e); W.__parityState = 'cancelled'; cleanup(); }
  }
  function cleanup() {
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('keydown', key, true);
    BLOCK.forEach(function (t) { document.removeEventListener(t, block, true); });
    if (box.parentNode) box.parentNode.removeChild(box);
    if (css.parentNode) css.parentNode.removeChild(css);
    W.__parityCleanup = null;
  }
  document.addEventListener('mousemove', move, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  BLOCK.forEach(function (t) { document.addEventListener(t, block, true); });
  W.__parityCleanup = cleanup;
  return 1;
})()`;

/** Asks the page how the picking is going: "picking", "done", "cancelled" or "". */
export const PICK_POLL = `(window.__parityState || '')`;

/** Cancels picking and removes the highlight. */
export const PICK_STOP = `(function () {
  var W = window;
  if (W.__parityCleanup) { try { W.__parityCleanup(); } catch (e) {} }
  if (W.__parityState === 'picking') W.__parityState = 'cancelled';
  return 1;
})()`;