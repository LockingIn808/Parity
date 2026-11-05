const test = require("node:test");
const assert = require("node:assert/strict");
const { commitFix, editStylesheet, ensureImport } = require("../src/changes/live");

// Tiny in-memory GitHub: refs -> commits -> trees (path -> content).
function fakeGitHub(files) {
  const commits = { c0: { tree: { ...files } } };
  const refs = { main: "c0" };
  const blobs = {};
  let n = 0;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    const { pathname, searchParams } = new URL(url);
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push(`${method} ${pathname}`);
    const ok = (data) => ({ ok: true, status: 200, json: async () => data });
    const fail = (status) => ({ ok: false, status, json: async () => ({}) });
    let m;
    if ((m = pathname.match(/\/git\/ref\/heads\/(.+)$/))) {
      const name = decodeURIComponent(m[1]);
      return refs[name] ? ok({ object: { sha: refs[name] } }) : fail(404);
    }
    if (method === "POST" && pathname.endsWith("/git/refs")) { refs[body.ref.replace("refs/heads/", "")] = body.sha; return ok({}); }
    if (method === "PATCH" && (m = pathname.match(/\/git\/refs\/heads\/(.+)$/))) { refs[decodeURIComponent(m[1])] = body.sha; return ok({}); }
    if ((m = pathname.match(/\/contents\/(.+)$/))) {
      const path = m[1].split("/").map(decodeURIComponent).join("/");
      const content = commits[searchParams.get("ref")]?.tree[path];
      return content === undefined ? fail(404) : ok({ type: "file", encoding: "base64", content: Buffer.from(content).toString("base64"), sha: "x" });
    }
    if (method === "GET" && (m = pathname.match(/\/git\/commits\/(.+)$/))) return ok({ tree: { sha: `tree-of-${m[1]}` } });
    if (pathname.endsWith("/git/blobs")) { const id = `b${++n}`; blobs[id] = body.content; return ok({ sha: id }); }
    if (pathname.endsWith("/git/trees")) {
      const parent = body.base_tree.replace("tree-of-", "");
      const tree = { ...commits[parent].tree };
      for (const item of body.tree) tree[item.path] = blobs[item.sha];
      const id = `t${++n}`; commits[`pending-${id}`] = { tree }; return ok({ sha: id });
    }
    if (method === "POST" && pathname.endsWith("/git/commits")) {
      const id = `c${++n}`; commits[id] = { tree: commits[`pending-${body.tree}`].tree, message: body.message }; return ok({ sha: id });
    }
    throw new Error(`unexpected ${method} ${pathname}`);
  };
  return { refs, commits, calls, file: (branch, path) => commits[refs[branch]]?.tree[path] };
}

const target = { owner: "team", repo: "demo", branch: "main", entryFile: "src/main.jsx" };
const fix = (property, value) => ({ selector: "button.cta", property, value });

test("Commit creates parity/fixes, adds the stylesheet and its import; main is untouched", async () => {
  const gh = fakeGitHub({ "src/main.jsx": "import React from 'react';\nimport './index.css';\nrender();\n" });
  const result = await commitFix("tok", { ...target, fix: fix("font-size", "16px"), action: "add" });
  assert.equal(result.branch, "parity/fixes");
  assert.match(gh.file("parity/fixes", "src/parity-fixes.css"), /button\.cta \{ font-size: 16px !important; \}/);
  assert.equal(gh.file("parity/fixes", "src/main.jsx"), "import React from 'react';\nimport './index.css';\nimport './parity-fixes.css';\nrender();\n");
  assert.equal(gh.refs.main, "c0", "main branch never moves");
  assert.match(result.compareUrl, /compare\/main\.\.\.parity\/fixes$/);
  assert.match(gh.commits[gh.refs["parity/fixes"]].message, /Set font-size to 16px on button\.cta/);
});

test("second Commit replaces the same property, Revert removes only that rule", async () => {
  const gh = fakeGitHub({ "src/main.jsx": "import './index.css';\n" });
  await commitFix("tok", { ...target, fix: fix("font-size", "16px"), action: "add" });
  await commitFix("tok", { ...target, fix: fix("color", "#111827"), action: "add" });
  await commitFix("tok", { ...target, fix: fix("font-size", "18px"), action: "add" });
  let css = gh.file("parity/fixes", "src/parity-fixes.css");
  assert.equal((css.match(/font-size/g) || []).length, 1);
  assert.match(css, /font-size: 18px/);
  await commitFix("tok", { ...target, fix: fix("font-size", "18px"), action: "remove" });
  css = gh.file("parity/fixes", "src/parity-fixes.css");
  assert.doesNotMatch(css, /font-size/);
  assert.match(css, /color: #111827/);
  assert.equal((gh.file("parity/fixes", "src/main.jsx").match(/parity-fixes/g) || []).length, 1, "import added once");
});

test("unsafe values and bad entry files are refused before touching GitHub", async () => {
  const gh = fakeGitHub({ "src/main.jsx": "" });
  await assert.rejects(commitFix("tok", { ...target, fix: fix("color", "red; display:none"), action: "add" }), /Unsupported CSS value/);
  await assert.rejects(commitFix("tok", { ...target, entryFile: "../secrets.js", fix: fix("color", "#000000"), action: "add" }), /entry file/);
  assert.equal(gh.calls.length, 0);
});

test("missing entry file gives a clear message", async () => {
  fakeGitHub({ "src/index.tsx": "" });
  await assert.rejects(commitFix("tok", { ...target, fix: fix("color", "#000000"), action: "add" }), /src\/main\.jsx was not found/);
});

test("pure helpers", () => {
  assert.equal(ensureImport("// no imports\nrun();"), "import './parity-fixes.css';\n// no imports\nrun();");
  const css = editStylesheet(undefined, { selector: "a", property: "color", value: "#000000" }, "add");
  assert.equal(editStylesheet(css, { selector: "a", property: "color", value: "#000000" }, "remove").includes("color"), false);
});
