import { useCallback, useEffect, useRef, useState } from "react";
import { COLLECT, type ElementSnapshot } from "../lib/inspect";
import { COLLECT_PICKED, PICK_POLL, PICK_START, PICK_STOP } from "../lib/pick";

/**
 * Two ways to get an element:
 *  1. startPick(): our own picker. Highlights on hover, you click, and you never leave Parity.
 *  2. The element selected in DevTools' Elements panel (the inspect tool). That one moves
 *     you to the Elements panel, which Chrome does not let extensions prevent.
 */
export function useSelectedElement(onPick: (el: ElementSnapshot) => void) {
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  });

  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const dt = typeof chrome === "undefined" ? undefined : chrome?.devtools;

  const stopTimer = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  // the inspect tool / Elements panel selection
  useEffect(() => {
    if (!dt) return;
    const read = () =>
      dt.inspectedWindow.eval(COLLECT, (result, info) => {
        if (!result || info?.isError || info?.isException) return;
        latest.current(result as ElementSnapshot);
      });
    dt.panels.elements.onSelectionChanged.addListener(read);
    return () => dt.panels.elements.onSelectionChanged.removeListener(read);
  }, [dt]);

  const cancelPick = useCallback(() => {
    stopTimer();
    setPicking(false);
    dt?.inspectedWindow.eval(PICK_STOP, () => {});
  }, [dt, stopTimer]);

  const startPick = useCallback(() => {
    if (!dt) return;
    stopTimer();
    setPickError(false);
    dt.inspectedWindow.eval(PICK_START, (_result, info) => {
      if (info?.isError || info?.isException) {
        setPickError(true);
        return;
      }
      setPicking(true);
      timer.current = window.setInterval(() => {
        dt.inspectedWindow.eval(PICK_POLL, (state) => {
          if (state === "picking") return;
          stopTimer();
          setPicking(false);
          if (state !== "done") return; // cancelled, or the page was reloaded
          dt.inspectedWindow.eval(COLLECT_PICKED, (result, info2) => {
            if (!result || info2?.isError || info2?.isException) return;
            latest.current(result as ElementSnapshot);
          });
        });
      }, 250);
    });
  }, [dt, stopTimer]);

  // tidy up if the panel closes while picking
  useEffect(() => () => stopTimer(), [stopTimer]);

  return { inDevtools: !!dt, picking, pickError, startPick, cancelPick };
}