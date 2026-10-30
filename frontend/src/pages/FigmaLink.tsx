import { useCallback, useEffect, useRef, useState } from "react";
import PillButton from "../components/PillButton";
import {
  deleteFigmaProject,
  listFigmaHistory,
  type FigmaFrame,
  type FigmaHistoryItem,
  type FigmaProject,
} from "../lib/api";

interface Props {
  url: string;
  error: string | null;
  project: FigmaProject | null; // connected (or awaiting a frame choice)
  onConnect: (url: string) => void;
  onSelectFrame: (frame: FigmaFrame) => void;
  onOpenHistory: (item: FigmaHistoryItem) => void;
}

const EXAMPLE = "https://www.figma.com/design/Xk29aQ/Homepage-redesign?node-id=0-1";
const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

function ago(iso?: string) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function FigmaLink({ url, error, project, onConnect, onSelectFrame, onOpenHistory }: Props) {
  const [value, setValue] = useState(url);
  const [dismissed, setDismissed] = useState(false);
  const [history, setHistory] = useState<FigmaHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const showError = Boolean(error) && !dismissed;

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    try {
      setHistory(await listFigmaHistory());
    } catch (err) {
      setHistory(null);
      setHistoryError(err instanceof Error ? err.message : "Could not load your Figma history.");
    }
  }, []);

  // Reload whenever the connected project or frame changes, so new connections appear at the top.
  useEffect(() => {
    void loadHistory();
  }, [loadHistory, project?.id, project?.selected_frame_id]);

  const submit = () => {
    setDismissed(false);
    onConnect(value);
  };

  const remove = async (item: FigmaHistoryItem) => {
    try {
      await deleteFigmaProject(item.id);
      setHistory((h) => (h ? h.filter((x) => x.id !== item.id) : h));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not remove that file.");
    }
  };

  const frames = project?.frames ?? [];

  return (
    <div className="space-y-3">
      <section className={card}>
        <h1 className="text-base font-semibold text-[var(--ink)]">Connect your Figma Design Here:</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Paste your Figma File URL</p>

        <input
          id="figurl"
          ref={input}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDismissed(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="figma.com/design/..."
          aria-label="Figma file URL"
          aria-invalid={showError}
          className={`mt-2 w-full rounded-lg border-[1.5px] bg-[var(--field)] px-3 py-2 text-xs text-[var(--ink)] outline-none ${
            showError ? "border-[var(--err)]" : "border-[var(--field-border)] focus:border-[var(--p1)]"
          }`}
        />

        {showError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-[var(--err)]">
            {error}
          </p>
        ) : (
          <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
            <span>The file must be viewable by the Figma account whose token the backend uses.</span>
            {import.meta.env.DEV && (
              <button
                type="button"
                className="cursor-pointer font-bold text-[var(--p1)]"
                onClick={() => {
                  setValue(EXAMPLE);
                  input.current?.focus();
                }}
              >
                Try an example
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="mt-2 w-full cursor-pointer rounded-lg bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Connect Design
        </button>
      </section>

      {frames.length > 0 && !showError && (
        <section className={card}>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            {project?.selected_frame_id ? "Frame" : "Select a Figma Frame"}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {project?.file_name ?? "This file"}: choose the screen or frame Parity should compare against.
          </p>

          <ul className="scroll mt-2 max-h-44 overflow-y-auto pr-2">
            {frames.map((frame) => {
              const selected = frame.id === project?.selected_frame_id;
              return (
                <li
                  key={frame.id}
                  className="flex items-center justify-between gap-3 border-t border-[var(--line)] py-2 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--ink)]">{frame.name}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">
                      {frame.page_name} · {frame.type}
                      {frame.width && frame.height ? ` · ${Math.round(frame.width)}×${Math.round(frame.height)}` : ""}
                    </p>
                  </div>
                  {selected ? (
                    <span className="shrink-0 rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--badge-text)]">
                      Selected ✓
                    </span>
                  ) : (
                    <PillButton variant="ghost" onClick={() => onSelectFrame(frame)} className="shrink-0 text-xs">
                      Select
                    </PillButton>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {showError && (
        <section className={card}>
          <h2 className="text-base font-semibold text-[var(--ink)]">Try this</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs">
            <li>Check the link is a Figma file link (figma.com/design/… or /file/…).</li>
            <li>Make sure the Figma account behind the backend’s token can open the file.</li>
            <li>Check the Parity backend is running and reachable.</li>
          </ol>
          <PillButton
            onClick={() => {
              setDismissed(true);
              input.current?.focus();
            }}
            className="mt-3 w-full text-xs"
          >
            Try again
          </PillButton>
        </section>
      )}

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--ink)]">Recent Figma files</h2>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="cursor-pointer text-[11px] font-bold text-[var(--p1)]"
          >
            Refresh
          </button>
        </div>

        {historyError ? (
          <div className="pt-2">
            <p role="alert" className="text-[11px] font-semibold text-[var(--err)]">
              {historyError}
            </p>
          </div>
        ) : history === null ? (
          <p className="pt-3 text-center text-xs text-[var(--muted)]">Loading your recent files…</p>
        ) : history.length === 0 ? (
          <div className="px-2 pb-1 pt-3 text-center">
            <p className="text-sm font-semibold text-[var(--ink)]">No files yet</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Files you connect will appear here.</p>
          </div>
        ) : (
          <ul className="scroll mt-2 max-h-48 overflow-y-auto pr-2">
            {history.map((item) => {
              const current = item.id === project?.id;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 border-t border-[var(--line)] py-2 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--ink)]">
                      {item.file_name || item.file_key}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {item.selected_frame_name ? `${item.selected_frame_name} · ` : "No frame yet · "}
                      {ago(item.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {current ? (
                      <span className="rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--badge-text)]">
                        Open
                      </span>
                    ) : (
                      <PillButton variant="ghost" onClick={() => onOpenHistory(item)} className="py-0.5 text-xs">
                        Open
                      </PillButton>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${item.file_name || item.file_key} from history`}
                      onClick={() => void remove(item)}
                      className="cursor-pointer px-1 text-sm text-[var(--muted)] hover:text-[var(--err)]"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
