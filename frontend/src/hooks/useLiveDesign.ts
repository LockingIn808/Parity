import { useState } from "react";
import { GithubAccessError, commitFixToGithub, type CommitTarget } from "../lib/api";
import { applyStyles, revertStyles } from "../lib/preview";
import { usePersistentState } from "./usePersistentState";

/** One CSS change for one element. `property` is the CSS property, e.g. "font-size". */
export interface FixRef {
  selector: string;
  property: string;
  value: string;
}

const keyOf = (f: FixRef) => `${f.selector}|${f.property}`;
const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * Preview / Commit / Revert for every list in the panel (page overview, category detail, element),
 * so a fix committed in one place shows as committed everywhere.
 */
export function useLiveDesign() {
  // The website repo Commit writes to (not tied to a Figma file).
  const [target, setTarget] = usePersistentState<CommitTarget | null>("parity-commit-target", null);
  const [committed, setCommitted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [waiting, setWaiting] = useState<FixRef[] | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const isCommitted = (fixes: FixRef[]) => fixes.length > 0 && fixes.every((f) => committed.has(keyOf(f)));

  /** Shows (or removes) changes on the inspected page. Temporary; never saved. */
  const preview = (parityId: string, fixes: FixRef[], on: boolean): Promise<void> => {
    const work = on
      ? applyStyles(parityId, fixes.map((f) => ({ property: f.property, value: f.value })))
      : revertStyles(parityId, fixes.map((f) => f.property));
    return work.catch((err) => setError(message(err, "Could not preview that change on the page.")));
  };

  const send = async (fixes: FixRef[], action: "add" | "remove", useTarget: CommitTarget) => {
    setBusy(true);
    setError(null);
    try {
      for (const fix of fixes) {
        const result = await commitFixToGithub(useTarget, fix, action);
        setLastLink(result.compareUrl);
        setCommitted((prev) => {
          const next = new Set(prev);
          if (action === "add") next.add(keyOf(fix));
          else next.delete(keyOf(fix));
          return next;
        });
      }
    } catch (err) {
      if (err instanceof GithubAccessError) setSetupOpen(true);
      setError(message(err, action === "add" ? "Commit failed." : "Revert failed."));
    } finally {
      setBusy(false);
    }
  };

  const commit = (fixes: FixRef[]) => {
    const vague = fixes.find((f) => !/[#.]/.test(f.selector));
    if (vague) {
      setError(
        `“${vague.selector}” has no class or id, so committing would restyle every element like it. Give it a class in your code, or use Copy CSS instead.`
      );
      return;
    }
    if (!target) {
      setWaiting(fixes);
      setSetupOpen(true);
      return;
    }
    void send(fixes, "add", target);
  };

  const revert = (fixes: FixRef[]) => {
    if (!target) {
      setError("Commit settings are missing, so Parity can't revert. Open them from a Commit button.");
      return;
    }
    void send(fixes, "remove", target);
  };

  const saveTarget = (next: CommitTarget) => {
    setTarget(next);
    setSetupOpen(false);
    if (waiting) void send(waiting, "add", next);
    setWaiting(null);
  };

  const cancelSetup = () => {
    setSetupOpen(false);
    setWaiting(null);
  };

  return {
    target,
    busy,
    error,
    clearError: () => setError(null),
    setupOpen,
    openSetup: () => setSetupOpen(true),
    saveTarget,
    cancelSetup,
    lastLink,
    isCommitted,
    preview,
    commit,
    revert,
  };
}

export type LiveDesign = ReturnType<typeof useLiveDesign>;
