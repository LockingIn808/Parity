import { useEffect, useRef } from "react";
import { COLLECT, type ElementSnapshot } from "../lib/inspect";
import { evalInPage, inDevtools } from "../lib/devtools";

/**
 * Calls onPick each time the element selected in DevTools' Elements panel changes
 * (that includes picking with the inspect tool). Returns true when running inside DevTools.
 */
export function useSelectedElement(onPick: (el: ElementSnapshot) => void): boolean {
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  });

  const available = inDevtools();

  useEffect(() => {
    if (!available) return;
    const read = () => {
      evalInPage<ElementSnapshot | null>(COLLECT)
        .then((result) => {
          if (result) latest.current(result);
        })
        .catch((error) => console.warn("[parity] could not read the selected element:", error));
    };
    const changed = chrome.devtools.panels.elements.onSelectionChanged;
    changed.addListener(read);
    return () => changed.removeListener(read);
  }, [available]);

  return available;
}
