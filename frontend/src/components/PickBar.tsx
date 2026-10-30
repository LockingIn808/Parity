import { useEffect, useRef, useState } from "react";
import PillButton from "./PillButton";
import { pickElement, stopPicking } from "../lib/picker";
import type { ElementSnapshot } from "../lib/inspect";

interface Props {
  onPicked: (snap: ElementSnapshot) => void;
}

/** "Pick element" without leaving the Parity tab. Chrome's own inspect arrow still works too. */
export default function PickBar({ onPicked }: Props) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signal = useRef({ cancelled: false });

  // Never leave the page in picking mode if the panel goes away.
  useEffect(() => () => {
    signal.current.cancelled = true;
    void stopPicking();
  }, []);

  const start = async () => {
    setError(null);
    signal.current = { cancelled: false };
    setPicking(true);
    try {
      const snap = await pickElement(signal.current);
      if (snap) onPicked(snap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start picking on this page.");
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {picking ? (
        <>
          <span className="flex-1 text-[11px] font-semibold text-[var(--p1)]">
            Hover the page and click an element… (Esc to cancel)
          </span>
          <PillButton variant="ghost" onClick={() => (signal.current.cancelled = true)}>
            Cancel
          </PillButton>
        </>
      ) : (
        <>
          <PillButton onClick={() => void start()}>⌖ Pick element</PillButton>
          <span className="min-w-0 flex-1 text-[10px] text-[var(--muted)]">
            or use Chrome’s inspect arrow / Elements panel
          </span>
        </>
      )}
      {error && (
        <p role="alert" className="w-full text-[11px] font-semibold text-[var(--err)]">
          {error}
        </p>
      )}
    </div>
  );
}
