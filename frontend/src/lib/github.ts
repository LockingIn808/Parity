const GH_USER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Accepts 'octocat', '@octocat' or a github.com link. Returns the username or null. */
export function ghName(v: string): string | null {
  const s = v.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[\/?#].*$/, '');
  return GH_USER.test(s) ? s : null;
}

export function initialsOf(user: string): string {
  const parts = user.split(/[-_.]/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : user.slice(0, 2)).toUpperCase();
}

// Files that are most likely the one that starts the app. They go to the top of the list.
const LIKELY = [
  /^src\/main\.(tsx|jsx|ts|js)$/,
  /^src\/index\.(tsx|jsx|ts|js)$/,
  /(^|\/)main\.(tsx|jsx|ts|js)$/,
  /(^|\/)index\.(tsx|jsx|ts|js)$/,
  /(^|\/)_app\.(tsx|jsx|ts|js)$/,
  /(^|\/)App\.(tsx|jsx)$/,
];
const likeliness = (path: string) => {
  const i = LIKELY.findIndex((re) => re.test(path));
  return i < 0 ? LIKELY.length : i;
};

/** The JS/TS files a user can pick as "the file that starts my app", most likely ones first. */
export function entryChoices(files: string[]): string[] {
  return files
    .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !f.includes("node_modules/"))
    .sort((a, b) => likeliness(a) - likeliness(b) || a.localeCompare(b))
    .slice(0, 300);
}
