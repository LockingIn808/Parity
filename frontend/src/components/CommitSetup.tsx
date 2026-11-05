import { useEffect, useMemo, useState } from "react";
import PillButton from "./PillButton";
import {
  GithubAccessError,
  listGithubRepos,
  listRepoFiles,
  type CommitTarget,
  type GithubRepo,
} from "../lib/api";
import { signInWithGitHub } from "../auth";

const field =
  "w-full rounded-lg border-[1.5px] border-[var(--field-border)] bg-[var(--field)] px-2 py-1.5 text-xs text-[var(--ink)]";

interface Props {
  initial: CommitTarget | null;
  onSave: (target: CommitTarget) => void;
  onCancel: () => void;
}

/** Picks where Commit writes. Shown the first time you commit, and from "change" afterwards. */
export default function CommitSetup({ initial, onSave, onCancel }: Props) {
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [repoKey, setRepoKey] = useState(initial ? `${initial.owner}/${initial.repo}` : "");
  const [branch, setBranch] = useState(initial?.branch ?? "");
  const [files, setFiles] = useState<string[] | null>(null);
  const [entryFile, setEntryFile] = useState(initial?.entryFile ?? "");
  const [error, setError] = useState<string | null>(null);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [reload, setReload] = useState(0);

  const fail = (err: unknown) => {
    setNeedsAccess(err instanceof GithubAccessError);
    setError(err instanceof Error ? err.message : "Something went wrong talking to GitHub.");
  };

  useEffect(() => {
    let alive = true;
    setError(null);
    (async () => {
      try {
        const all: GithubRepo[] = [];
        for (let page = 1; page <= 3; page++) {
          const batch = await listGithubRepos(page);
          all.push(...batch);
          if (batch.length < 100) break;
        }
        if (alive) setRepos(all.filter((r) => r.canPush));
      } catch (err) {
        if (alive) fail(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const repo = useMemo(() => repos?.find((r) => `${r.owner}/${r.name}` === repoKey) ?? null, [repos, repoKey]);

  // Load the repo's code files whenever the repo or branch changes.
  useEffect(() => {
    if (!repo || !branch.trim()) return;
    let alive = true;
    setFiles(null);
    listRepoFiles(repo.owner, repo.name, branch.trim())
      .then((result) => {
        if (!alive) return;
        const code = result.files.filter((f) => /\.(jsx?|tsx?)$/.test(f) && !f.includes("node_modules/"));
        // Likely entry files first: src/main.*, src/index.*
        code.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
        setFiles(code);
        setEntryFile((current) => (current && code.includes(current) ? current : code[0] ?? ""));
      })
      .catch((err) => alive && fail(err));
    return () => {
      alive = false;
    };
  }, [repo, branch]);

  const reconnect = async () => {
    setError(null);
    try {
      await signInWithGitHub();
      setNeedsAccess(false);
      setReload((n) => n + 1);
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="mb-2 rounded-xl border-[1.5px] border-[var(--p1)] bg-[var(--card-tint)] p-3">
      <p className="text-xs font-semibold text-[var(--ink)]">Where should Commit save fixes?</p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">
        Parity commits to a separate <b>parity/fixes</b> branch of this repo (never your base branch), adding one
        stylesheet that your entry file imports. Merge it with a pull request when you’re happy.
      </p>

      {error && (
        <div className="mt-2">
          <p role="alert" className="text-[11px] font-semibold text-[var(--err)]">
            {error}
          </p>
          {needsAccess && (
            <PillButton className="mt-1" onClick={() => void reconnect()}>
              Connect GitHub
            </PillButton>
          )}
        </div>
      )}

      {!needsAccess && (
        <div className="mt-2 space-y-2">
          <label className="block text-[10px] font-bold text-[var(--ink)]">
            Repository
            {repos === null ? (
              <p className="font-normal text-[var(--muted)]">Loading your repositories…</p>
            ) : (
              <select
                className={field}
                value={repoKey}
                onChange={(e) => {
                  setRepoKey(e.target.value);
                  const next = repos.find((r) => `${r.owner}/${r.name}` === e.target.value);
                  setBranch(next?.defaultBranch ?? "");
                  setEntryFile("");
                }}
              >
                <option value="">Choose a repository you can push to…</option>
                {repos.map((r) => (
                  <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>
                    {r.owner}/{r.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          {repo && (
            <label className="block text-[10px] font-bold text-[var(--ink)]">
              Base branch
              <input className={field} value={branch} onChange={(e) => setBranch(e.target.value)} />
            </label>
          )}

          {repo && branch.trim() && (
            <label className="block text-[10px] font-bold text-[var(--ink)]">
              App entry file (the one that renders your app, e.g. src/main.jsx)
              {files === null ? (
                <p className="font-normal text-[var(--muted)]">Loading files…</p>
              ) : files.length === 0 ? (
                <p className="font-normal text-[var(--err)]">No JavaScript/TypeScript files on that branch.</p>
              ) : (
                <select className={field} value={entryFile} onChange={(e) => setEntryFile(e.target.value)}>
                  {files.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <PillButton
          disabled={!repo || !branch.trim() || !entryFile}
          onClick={() =>
            repo && onSave({ owner: repo.owner, repo: repo.name, branch: branch.trim(), entryFile })
          }
        >
          Save
        </PillButton>
        <PillButton variant="ghost" onClick={onCancel}>
          Cancel
        </PillButton>
      </div>
    </div>
  );
}

function rank(path: string) {
  if (/^src\/main\.(jsx?|tsx?)$/.test(path)) return 0;
  if (/^src\/index\.(jsx?|tsx?)$/.test(path)) return 1;
  if (/(^|\/)(main|index)\.(jsx?|tsx?)$/.test(path)) return 2;
  if (path.startsWith("src/")) return 3;
  return 4;
}
