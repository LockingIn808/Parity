const test = require("node:test");
const assert = require("node:assert/strict");
const { compareElement } = require("../src/compare");
const { buildStyleFixes, spacingToken } = require("../src/fixes");
const { commitFixesFromCss } = require("../src/changes/fixes");

const base = {
  tag: "button", selector: "button.cta", text: "Buy", fontFamily: "Inter",
  fontSize: 16, fontWeight: 600, color: "#111827", background: "#FFFFFF",
  width: 120, height: 40, padding: 12, gap: 0,
};
const node = {
  id: "1:2", name: "Buy", type: "FRAME", text: null, visible: true,
  font_family: "Inter", font_size: 16, font_weight: 600, color: "#111827",
  background: "#FFFFFF", width: 120, height: 40, padding: 12, gap: 0,
};

test("sub-pixel float noise is not a mismatch", () => {
  const result = compareElement({
    element: { ...base, width: 120.3, height: 39.8, fontSize: 16.2 },
    nodes: [node], figmaNodeId: "1:2",
  });
  assert.equal(result.design_score, 100);
  assert.deepEqual(result.suggested_fixes, []);
});

test("asymmetric padding is compared per side, not averaged away", () => {
  const element = { ...base, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12 };
  const figma = { ...node, padding_top: 8, padding_right: 16, padding_bottom: 8, padding_left: 16 };
  const result = compareElement({ element, nodes: [figma], figmaNodeId: "1:2" });
  assert.ok(result.design_score < 100, "same average but different sides must not score 100");
  assert.equal(result.css_fixes.padding, "8px 16px 8px 16px");
  const fix = result.suggested_fixes.find((f) => f.property === "padding");
  assert.deepEqual(fix.tailwind, ["px-4", "py-2"]);
});

test("border radius is scored when both sides have it", () => {
  const result = compareElement({
    element: { ...base, borderRadius: 2 },
    nodes: [{ ...node, corner_radius: 8 }], figmaNodeId: "1:2",
  });
  assert.ok(result.design_score < 100);
  assert.equal(result.css_fixes["border-radius"], "8px");
});

test("Tailwind uses exact named tokens only where they are exact", () => {
  assert.equal(spacingToken(16), "4");
  assert.equal(spacingToken(13), "[13px]");
  const { tailwind_classes } = buildStyleFixes(
    { fontFamily: "Arial", fontWeight: 400 },
    { fontFamily: "Plus Jakarta Sans", fontWeight: 600, gap: 8, cornerRadius: 9999 }
  );
  assert.ok(tailwind_classes.includes("font-['Plus_Jakarta_Sans']"));
  assert.ok(tailwind_classes.includes("font-semibold"));
  assert.ok(tailwind_classes.includes("gap-2"));
  assert.ok(tailwind_classes.includes("rounded-full"));
});

test("each suggested fix carries what the live preview needs", () => {
  const result = compareElement({ element: { ...base, color: "#FF0000" }, nodes: [node], figmaNodeId: "1:2" });
  const fix = result.suggested_fixes.find((f) => f.property === "color");
  assert.equal(fix.css_property, "color");
  assert.equal(fix.expected, "#111827");
  assert.deepEqual(result.tailwind_fix_classes, ["text-[#111827]"]);
});

test("multi-word font family survives the commit-fix validator", () => {
  const result = compareElement({ element: { ...base, fontFamily: "Arial" }, nodes: [{ ...node, font_family: "Plus Jakarta Sans" }], figmaNodeId: "1:2" });
  const fixes = commitFixesFromCss(".cta", result.css_fixes);
  assert.equal(fixes[0].value, '"Plus Jakarta Sans"');
});

test("four-side padding passes the commit validator", () => {
  const fixes = commitFixesFromCss(".cta", { padding: "8px 16px 8px 16px" });
  assert.equal(fixes[0].value, "8px 16px 8px 16px");
});

// A typical Figma button: FRAME (fill, padding, radius) > TEXT (font, colour).
const buttonFrame = { id: "5:1", parent_id: "0:1", name: "Button", type: "FRAME", visible: true, width: 120, height: 40, background: "#5A32C6", padding: 12, padding_top: 12, padding_right: 24, padding_bottom: 12, padding_left: 24, corner_radius: 8 };
const buttonText = { id: "5:2", parent_id: "5:1", name: "Label", type: "TEXT", text: "Buy now", visible: true, width: 72, height: 16, font_family: "Inter", font_size: 14, font_weight: 600, color: "#FFFFFF" };
const domButton = { tag: "button", selector: "button.buy", text: "Buy now", fontFamily: "Inter", fontSize: 14, fontWeight: 600, color: "#FFFFFF", background: "#5A32C6", width: 120, height: 40, padding: 18, paddingTop: 12, paddingRight: 24, paddingBottom: 12, paddingLeft: 24, gap: 0, borderRadius: 8 };

test("auto-match on the button text lifts to the button frame and compares everything", () => {
  const result = compareElement({ element: domButton, nodes: [buttonFrame, buttonText] });
  assert.equal(result.matched_node.id, "5:1");
  assert.equal(result.text_node.id, "5:2");
  assert.ok(result.categories.every((c) => c.fraction !== null), "all four categories comparable");
  assert.equal(result.design_score, 100);
});

test("picking the frame by hand pulls typography from its single text layer", () => {
  const result = compareElement({ element: { ...domButton, fontSize: 12 }, nodes: [buttonFrame, buttonText], figmaNodeId: "5:1" });
  assert.equal(result.css_fixes["font-size"], "14px");
});

test("a plain text element sized like its text stays matched to the text layer", () => {
  const span = { tag: "span", selector: "span", text: "Buy now", fontFamily: "Inter", fontSize: 14, fontWeight: 600, color: "#FFFFFF", background: "#5A32C6", width: 72, height: 16, padding: 0, gap: 0 };
  const result = compareElement({ element: span, nodes: [buttonFrame, buttonText] });
  assert.equal(result.matched_node.id, "5:2");
  assert.equal(result.text_node, null);
});

const { askGemini } = require("../src/ai/ask");

test("askGemini sends context as data and returns plain text, skipping thoughts", async () => {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  try {
    const answer = await askGemini({ selector: "h1" }, "Why?", async (url, options) => {
      assert.match(url, /gemini-3\.5-flash-lite:generateContent/);
      assert.equal(options.headers["x-goog-api-key"], "test-key");
      assert.match(JSON.parse(options.body).contents[0].parts[0].text, /"selector":"h1"/);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: "hidden" }, { text: " Font is 2px small. " }] } }] }) };
    });
    assert.equal(answer, "Font is 2px small.");
    await assert.rejects(askGemini({}, "q", async () => ({ ok: false, status: 429 })), /rate limit/);
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(askGemini({}, "q"), (e) => e.status === 503);
  } finally {
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  }
});
