/** Try a fix on the real page (temporary inline styles on the selected element) and undo it again. */

const hasDevtools = () => typeof chrome !== "undefined" && !!chrome?.devtools;

/** True inside Chrome DevTools, the only place these can run. */
export const canTryOnPage = hasDevtools;

function run(expression: string): Promise<unknown> {
  return new Promise((resolve) => {
    if (!hasDevtools()) return resolve(null);
    chrome!.devtools!.inspectedWindow.eval(expression, (result, info) => {
      resolve(info?.isError || info?.isException ? null : result);
    });
  });
}

// $0 is the element selected in DevTools. Whatever we change is remembered on the page,
// so the original inline values can be put back, even after the selection moves.
const KEEP = "(window.__parityKept = window.__parityKept || [])";

export const applyCss = async (css: Record<string, string>) =>
  (await run(
    "(function (el, css) {" +
      "if (!el || el.nodeType !== 1) return false;" +
      "var mine = el.__parityOld = el.__parityOld || {};" +
      "if (" + KEEP + ".indexOf(el) < 0) " + KEEP + ".push(el);" +
      "Object.keys(css).forEach(function (p) {" +
      "if (!(p in mine)) mine[p] = [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)];" +
      "el.style.setProperty(p, css[p], 'important');" +
      "});" +
      "return true;" +
      "})($0, " + JSON.stringify(css) + ")"
  )) === true;

/** Puts back the listed properties on every element we touched (or all of them when props is empty). */
export const undoCss = (props: string[] = []) =>
  run(
    "(function (props) {" +
      KEEP + ".forEach(function (el) {" +
      "var mine = el.__parityOld || {};" +
      "Object.keys(mine).forEach(function (p) {" +
      "if (props.length && props.indexOf(p) < 0) return;" +
      "if (mine[p][0]) el.style.setProperty(p, mine[p][0], mine[p][1]); else el.style.removeProperty(p);" +
      "delete mine[p];" +
      "});" +
      "});" +
      "})(" + JSON.stringify(props) + ")"
  );

/** Address of the page being inspected (the backend needs it when it prepares a commit). */
export async function inspectedPageUrl(): Promise<string> {
  const url = await run("location.href");
  return typeof url === "string" ? url : "";
}
