import PillButton from "../components/PillButton";

export interface ComparedElement {
  selector: string;
  score: number;
}

interface Props {
  file: string;
  frame: string;
  connected: boolean;
  inDevtools: boolean;
  recent: ComparedElement[];
  onGoFigma: () => void;
}

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

/** Design tab before an element is picked: what is connected and what to do next. */
export default function DesignComparison({ file, frame, connected, inDevtools, recent, onGoFigma }: Props) {
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
            ? "Pick an element with Chrome’s inspect tool (the arrow at the top left of DevTools) or click one in the Elements panel."
            : "Open this panel inside Chrome DevTools to inspect elements on a page."}
        </p>
      </section>

      {recent.length > 0 && (
        <section className={card}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--ink)]">Compared this session</h3>
          <ul>
            {recent.map((r) => (
              <li
                key={r.selector}
                className="flex items-center justify-between border-t border-[var(--line)] py-1.5 text-xs first:border-t-0"
              >
                <span className="truncate font-mono text-[11px]">{r.selector}</span>
                <span className="ml-2 font-semibold text-[var(--p1)]">{r.score}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
