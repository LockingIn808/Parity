import { evalInPage } from "./devtools";
import { COLLECT_FN, type ElementSnapshot } from "./inspect";

export const SCAN_LIMIT = 60;

/**
 * Whole-page scan: the visible headings, text, links, buttons, images and form fields, in page
 * order, read with the same COLLECT function as a single element (so each can be reopened later).
 * Plain string: no backticks, dollar-brace or backslashes inside, apart from the COLLECT_FN insert.
 */
const SCAN = `(function () {
  var collect = ${COLLECT_FN};
  var query = 'h1,h2,h3,h4,h5,h6,p,a,button,input,select,textarea,img,label,li,td,th,figcaption,blockquote,span,[role=button],[role=link]';
  var all = document.querySelectorAll(query);
  var picks = [];
  var considered = 0;
  for (var i = 0; i < all.length && picks.length < ${SCAN_LIMIT}; i++) {
    var el = all[i];
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    var tag = String(el.tagName).toUpperCase();
    var control = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'IMG'].indexOf(tag) > -1 || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link';
    if (!control) {
      var own = '';
      for (var c = 0; c < el.childNodes.length; c++) {
        if (el.childNodes[c].nodeType === 3) own += el.childNodes[c].nodeValue;
      }
      if (!own.trim()) continue;
      if (['SPAN', 'LI', 'TD', 'TH'].indexOf(tag) > -1 && el.parentElement && el.parentElement.closest('a,button,label,h1,h2,h3,h4,h5,h6')) continue;
    }
    considered += 1;
    var snap = collect(el);
    if (snap && !snap.invisible) picks.push(snap);
  }
  return { elements: picks, candidates: all.length, considered: considered };
})()`;

export interface PageScan {
  elements: ElementSnapshot[];
  candidates: number;
  at: number;
}

export async function scanPage(): Promise<PageScan> {
  const result = await evalInPage<{ elements: ElementSnapshot[]; candidates: number } | null>(SCAN);
  if (!result) throw new Error("Could not read this page. Reload it and try again.");
  return { elements: result.elements, candidates: result.candidates, at: Date.now() };
}
