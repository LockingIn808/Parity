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