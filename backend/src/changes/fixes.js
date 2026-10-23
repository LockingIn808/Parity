// Only properties that can be represented faithfully as CSS declarations.
const properties = {
  color: 'color', backgroundColor: 'background-color', fontSize: 'font-size',
  borderRadius: 'border-radius', fontWeight: 'font-weight',
  marginTop: 'margin-top', marginRight: 'margin-right', marginBottom: 'margin-bottom', marginLeft: 'margin-left',
  paddingTop: 'padding-top', paddingRight: 'padding-right', paddingBottom: 'padding-bottom', paddingLeft: 'padding-left'
};
function validateFix(fix) {
  if (!fix || typeof fix.selector !== 'string' || !fix.selector || fix.selector.length > 1500 || /[{}\n\r\u0000]/.test(fix.selector)) throw new Error('Invalid selector');
  if (!Object.values(properties).includes(fix.property)) throw new Error('Unsupported CSS property');
  const value = String(fix.value);
  const valid = ['color','background-color'].includes(fix.property)
    ? /^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(value)
    : fix.property === 'font-weight' ? /^(normal|bold|[1-9]00)$/.test(value)
    : /^(0|\d+(\.\d+)?px)$/.test(value);
  if (!valid) throw new Error('Unsupported CSS value');
  return { selector: fix.selector, property: fix.property, value };
}
function makeFixes(design, page) {
  return design.designIssues.flatMap((issue, index) => {
    const property = properties[issue.property];
    const match = design.matching.find(m => m.designId === issue.element);
    const element = page.elements.find(e => e.id === match?.webpageId);
    if (!property || !element?.selector) return [];
    const value = typeof issue.expected === 'number' && !['fontWeight'].includes(issue.property) ? `${issue.expected}px` : String(issue.expected);
    try {
      return [{ id: `fix-${index}`, ...validateFix({ selector: element.selector, property, value }),
        originalValue: issue.actual, text: element.text, kind: 'design',
        note: 'Matches the supplied design; accessibility improvement is not guaranteed.' }];
    } catch { return []; }
  });
}
function cssFor(fixes) {
  if (!Array.isArray(fixes) || !fixes.length || fixes.length > 100) throw new Error('Select 1–100 fixes');
  return '/* Parity overrides — reviewed styling changes */\n' + fixes.map(validateFix).map(f =>
    `${f.selector} { ${f.property}: ${f.value} !important; }`).join('\n') + '\n';
}
module.exports = { makeFixes, validateFix, cssFor };
