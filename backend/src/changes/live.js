// Per-fix Commit / Revert for the panel. Every fix lives as one line in a Parity stylesheet on a
// separate "parity/fixes" branch, so the repo's main branch is never touched and the work can be
// reviewed and merged as a normal pull request. Commit adds or replaces a line; Revert removes it.
const { createHash } = require('node:crypto');
const { validateFix } = require('./fixes');
const { github, repoPath, readFile } = require('./github');

const WORK_BRANCH = 'parity/fixes';
const CSS_NAME = 'parity-fixes.css';
const HEADER = '/* Parity: design fixes committed from the Parity DevTools panel. One rule per line. */\n';

const refPath = (branch) => branch.split('/').map(encodeURIComponent).join('/');
const ruleKey = (fix) => createHash('sha1').update(`${fix.selector}|${fix.property}`).digest('hex').slice(0, 12);

/** Pure: returns the stylesheet with this fix added/replaced (add) or removed (remove). */
function editStylesheet(css, fix, action) {
  const marker = `/* parity:${ruleKey(fix)} */`;
  const lines = (css || HEADER).split('\n').filter((line) => !line.startsWith(marker));
  if (action === 'add') {
    lines.splice(lines.length && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length, 0,
      `${marker} ${fix.selector} { ${fix.property}: ${fix.value} !important; }`);
  }
  let out = lines.join('\n');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

/** Pure: makes sure the app entry file imports the Parity stylesheet (after its other imports, so it wins). */
function ensureImport(source, cssName = CSS_NAME) {
  const statement = `import './${cssName}';`;
  if (source.includes(`./${cssName}`)) return source;
  const lines = source.split('\n');
  let last = -1;
  lines.forEach((line, index) => { if (/^\s*import\s/.test(line)) last = index; });
  lines.splice(last + 1, 0, statement);
  return lines.join('\n');
}

async function tryRead(token, base, path, ref) {
  try {
    return await readFile(token, base, path, ref);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function commitFix(token, { owner, repo, branch, entryFile, fix, action }) {
  if (!['add', 'remove'].includes(action)) throw new Error('action must be add or remove');
  if (typeof branch !== 'string' || !/^[\w./-]+$/.test(branch)) throw new Error('Choose a valid base branch');
  if (typeof entryFile !== 'string' || !/\.(jsx?|tsx?)$/.test(entryFile) || entryFile.split('/').some((p) => !p || p === '.' || p === '..')) {
    throw new Error('Choose the app entry file, e.g. src/main.jsx');
  }
  const clean = validateFix(fix);
  const base = repoPath(owner, repo);
  const dir = entryFile.includes('/') ? entryFile.slice(0, entryFile.lastIndexOf('/') + 1) : '';
  const cssPath = dir + CSS_NAME;

  // Work branch: reuse it, or start it from the chosen base branch.
  let head;
  try {
    head = (await github(token, `${base}/git/ref/heads/${refPath(WORK_BRANCH)}`)).object.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
    const baseHead = (await github(token, `${base}/git/ref/heads/${refPath(branch)}`)).object.sha;
    await github(token, `${base}/git/refs`, 'POST', { ref: `refs/heads/${WORK_BRANCH}`, sha: baseHead });
    head = baseHead;
  }

  const entry = await tryRead(token, base, entryFile, head);
  if (!entry) throw new Error(`${entryFile} was not found on ${WORK_BRANCH}. Check the entry file in the commit settings.`);
  const css = await tryRead(token, base, cssPath, head);

  const changes = [];
  const nextCss = editStylesheet(css?.content, clean, action);
  if (nextCss !== (css?.content ?? '')) changes.push({ path: cssPath, content: nextCss });
  const nextEntry = ensureImport(entry.content);
  if (nextEntry !== entry.content) changes.push({ path: entryFile, content: nextEntry });

  const compareUrl = `https://github.com/${owner}/${repo}/compare/${refPath(branch)}...${refPath(WORK_BRANCH)}`;
  if (changes.length === 0) return { branch: WORK_BRANCH, commitSha: head, unchanged: true, compareUrl };

  const parent = await github(token, `${base}/git/commits/${head}`);
  const tree = [];
  for (const change of changes) {
    const blob = await github(token, `${base}/git/blobs`, 'POST', { content: change.content, encoding: 'utf-8' });
    tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const nextTree = await github(token, `${base}/git/trees`, 'POST', { base_tree: parent.tree.sha, tree });
  const verb = action === 'add' ? 'Set' : 'Revert';
  const commit = await github(token, `${base}/git/commits`, 'POST', {
    message: `Parity: ${verb} ${clean.property}${action === 'add' ? ` to ${clean.value}` : ''} on ${clean.selector}`,
    tree: nextTree.sha,
    parents: [head],
  });
  try {
    await github(token, `${base}/git/refs/heads/${refPath(WORK_BRANCH)}`, 'PATCH', { sha: commit.sha, force: false });
  } catch (error) {
    if (error.status === 422) throw new Error(`${WORK_BRANCH} changed on GitHub while committing. Try again.`);
    throw error;
  }

  return {
    branch: WORK_BRANCH,
    commitSha: commit.sha,
    url: `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
    compareUrl,
  };
}

module.exports = { commitFix, editStylesheet, ensureImport, WORK_BRANCH };
