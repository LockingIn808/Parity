import { evalInPage } from "./devtools";

/**
 * Live Design Sync: temporarily sets inline styles (with !important) on the one inspected
 * element. The original inline values are saved in the page so revert restores them exactly.
 * Nothing is written to source files; reloading the page also removes every preview.
 */
export interface StyleChange {
  property: string; // CSS property, e.g. "font-size"
  value: string; // e.g. "16px"
}

const run = (parityId: string, body: string) =>
  evalInPage<{ ok: boolean; error?: string }>(`(function () {
    var store = window.__parity;
    var el = store && store.els[${JSON.stringify(parityId)}];
    if (!el || !el.isConnected) return { ok: false, error: 'The element is no longer on the page. Select it again.' };
    var saved = store.orig[${JSON.stringify(parityId)}] || (store.orig[${JSON.stringify(parityId)}] = {});
    ${body}
    return { ok: true };
  })()`).then((result) => {
    if (!result?.ok) throw new Error(result?.error || "Preview failed");
  });

export function applyStyles(parityId: string, changes: StyleChange[]): Promise<void> {
  return run(
    parityId,
    `var changes = ${JSON.stringify(changes)};
    changes.forEach(function (c) {
      if (!(c.property in saved)) {
        saved[c.property] = { value: el.style.getPropertyValue(c.property), priority: el.style.getPropertyPriority(c.property) };
      }
      el.style.setProperty(c.property, c.value, 'important');
    });`
  );
}

export function revertStyles(parityId: string, properties: string[]): Promise<void> {
  return run(
    parityId,
    `var props = ${JSON.stringify(properties)};
    props.forEach(function (p) {
      if (!(p in saved)) return;
      if (saved[p].value) el.style.setProperty(p, saved[p].value, saved[p].priority);
      else el.style.removeProperty(p);
      delete saved[p];
    });`
  );
}
