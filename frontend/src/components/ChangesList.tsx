import { useEffect, useRef, useState } from "react";
import type { Change, Part } from "../types/design";
import ChangeItem from "./ChangeItem";

interface Props {
  changes: Change[];
  parts: Part[];
  sub?: "priority" | "fix"; // what to print under each title
}

export default function ChangesList({ changes, parts, sub = "priority" }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Rows with live data preview on the page while open and commit to GitHub; others keep the local toggle.
  const openRef = useRef<{ id: string | null; changes: Change[] }>({ id: null, changes });
  openRef.current = { id: openId, changes };
  useEffect(
    () => () => {
      const { id, changes: list } = openRef.current;
      list.find((c) => c.id === id)?.live?.preview?.(false);
    },
    []
  );

  const togglePreview = (c: Change) => {
    if (openId) changes.find((x) => x.id === openId)?.live?.preview?.(false);
    const next = openId === c.id ? null : c.id;
    if (next) c.live?.preview?.(true);
    setOpenId(next);
  };

  const commit = (c: Change) => {
    if (c.live?.commit) {
      if (c.live.committed) c.live.revert?.();
      else c.live.commit();
      return;
    }
    toggleDone(c.id);
  };

  const toggleDone = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const rows = changes.flatMap((c) => {
    const part = parts.find((p) => p.id === c.partId);
    return part ? [{ c, part }] : [];
  });

  return (
    <section className="rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]">
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">Changes to Prioritize</h3>
      {rows.length > 0 ? (
        <ul className="scroll max-h-40 overflow-y-auto pr-2">
          {rows.map(({ c, part }) => (
            <ChangeItem
              key={c.id}
              change={c}
              part={part}
              subtitle={sub === "fix" ? part.fixLabel : c.priority}
              open={openId === c.id}
              done={c.live?.commit ? Boolean(c.live.committed) : done.has(c.id)}
              onPreview={() => togglePreview(c)}
              onCommit={() => commit(c)}
            />
          ))}
        </ul>
      ) : (
        <div className="px-2 pb-1 pt-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] shadow-[0_6px_14px_rgba(90,50,198,.3)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">You’re all in sync</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">No changes to prioritize.</p>
        </div>
      )}
    </section>
  );
}