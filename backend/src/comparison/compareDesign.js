const normalize = text => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
function color(value) {
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16)).concat(1);
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) return null;
  const values = rgb[1].split(',').map(Number);
  return values.length === 3 ? values.concat(1) : values;
}
function loss(property, expected, actual) {
  if (actual === undefined) return 1;
  if (typeof expected === 'number') {
    const tolerance = property === 'fontWeight' ? 50 : property === 'fontSize' ? 1 : 2;
    const scale = Math.max(['x','y'].includes(property) ? 40 : 10, Math.abs(expected) * 0.4);
    return Math.min(1, Math.max(0, Math.abs(expected - actual) - tolerance) / scale);
  }
  const a = color(expected), b = color(actual);
  if (a && b) return Math.min(1, Math.hypot(...a.slice(0,3).map((v,i) => v-b[i])) / 255 + Math.abs(a[3]-b[3]));
  return normalize(expected) === normalize(actual) ? 0 : 1;
}
function compareDesign(figma, page) {
  const used = new Set(), issues = [], matches = [];
  let totalScore = 0;
  const properties = { x: 15, y: 15, width: 15, height: 15, fontSize: 10,
    fontWeight: 5, color: 10, backgroundColor: 10, borderRadius: 5, marginTop: 5, marginRight: 5, marginBottom: 5, marginLeft: 5,
    paddingTop: 5, paddingRight: 5, paddingBottom: 5, paddingLeft: 5 };
  for (const expected of figma.elements) {
    // Match equal type/text, then pick the nearest unused element.
    const candidates = page.elements.filter(el => !used.has(el.id) && el.type === expected.type &&
      (!expected.text || normalize(el.text) === normalize(expected.text)));
    candidates.sort((a,b) => Math.hypot(a.x-expected.x,a.y-expected.y) - Math.hypot(b.x-expected.x,b.y-expected.y));
    const actual = candidates[0];
    if (!actual) { issues.push({ element: expected.id, property: 'missing', expected: expected.type, actual: null }); continue; }
    used.add(actual.id);
    matches.push({ designId: expected.id, webpageId: actual.id });
    let weightedLoss = 0, weight = 0;
    for (const [property, importance] of Object.entries(properties)) {
      const a = expected[property] ?? expected.style?.[property];
      if (a === undefined) continue;
      const b = actual[property] ?? actual.style?.[property];
      const difference = loss(property, a, b);
      weightedLoss += difference * importance;
      weight += importance;
      if (difference > 0) issues.push({ element: expected.id, property, expected: a, actual: b ?? null });
    }
    if (!weight) throw new Error('Figma elements need measurable properties');
    totalScore += 100 * (1 - weightedLoss / weight);
  }
  return { designScore: Math.round(totalScore / figma.elements.length), matchedElements: matches.length,
    missingElements: figma.elements.length - matches.length, matching: matches, designIssues: issues };
}
module.exports = { compareDesign };
