import PillButton from "../components/PillButton";
import type { ElementSnapshot } from "../lib/inspect";

export interface ComparedElement {
  selector: string;
  score: number;
  snap: ElementSnapshot;
}

interface Props {
  file: string;
  frame: string;
  connected: boolean;
  inDevtools: boolean;
  recent: ComparedElement[];
  onOpen: (snap: ElementSnapshot) => void;
  onGoFigma: () => void;
}

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

/** Design tab before an element is picked: what is connected and what to do next. */
export default function DesignComparison({ file, frame, connected, inDevtools, recent, onOpen, onGoFigma }: Props) {
  if (!connected) {
    return (
      <section className={card}>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Connect a Figma frame first</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Parity compares the element you inspect with a layer in the Figma frame you choose.
        </p>
        <PillButton className="mt-3" onClick={onGoFigma}>
          Go to Figma Link
        </PillButton>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section className={card}>
        <p className="text-[11px] text-[var(--muted)]">Comparing against</p>
        <p className="truncate text-sm font-semibold text-[var(--ink)]">{frame || "Selected frame"}</p>
        <p className="truncate text-[11px] text-[var(--muted)]">{file}</p>
        <p className="mt-3 text-xs text-[var(--ink2)]">
          {inDevtools
            ? "Click ⌖ Pick element above, then click any part of the page to compare it with this frame."
            : "Open this panel inside Chrome DevTools to inspect elements on a page."}
        </p>
      </section>

      {recent.length > 0 && (
        <section className={card}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--ink)]">Compared this session</h3>
          <ul>
            {recent.map((r) => (
              <li key={r.snap.parityId} className="border-t border-[var(--line)] first:border-t-0">
                <button
                  type="button"
                  onClick={() => onOpen(r.snap)}
                  title="Open this result again"
                  className="flex w-full cursor-pointer items-center justify-between py-1.5 text-left text-xs hover:text-[var(--p1)]"
                >
                  <span className="truncate font-mono text-[11px]">{r.selector}</span>
                  <span className="ml-2 font-semibold text-[var(--p1)]">{r.score}% ›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
