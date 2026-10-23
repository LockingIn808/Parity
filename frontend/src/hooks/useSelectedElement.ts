import { useEffect, useRef } from "react";
import { COLLECT, type ElementSnapshot } from "../lib/inspect";

/**
 * Calls onPick each time the element selected in DevTools' Elements panel changes
 * (that includes picking with the inspect tool). Returns true when running inside DevTools.
 */
export function useSelectedElement(onPick: (el: ElementSnapshot) => void): boolean {
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  });

  const dt = typeof chrome === "undefined" ? undefined : chrome?.devtools;

  useEffect(() => {
    if (!dt) return;
    const read = async () => {
      try {
        const result =
          await dt.inspectedWindow.eval<ElementSnapshot | null>(COLLECT);

        if (!result) return;
        latest.current(result);
      } catch {
        // Ignore DevTools evaluation failures.
      }
    };
    dt.panels.elements.onSelectionChanged.addListener(read);
    return () => dt.panels.elements.onSelectionChanged.removeListener(read);
  }, [dt]);

  return !!dt;
}