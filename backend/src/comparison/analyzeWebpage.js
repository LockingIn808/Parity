const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
async function analyzeWebpage(url, frame) {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.COMPARE_BROWSER_PATH ? { executablePath: process.env.COMPARE_BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: frame });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(url, { waitUntil: 'load' });
    const elements = await page.evaluate(() => {
      return [...document.querySelectorAll('button,input,select,textarea,a,img,h1,h2,h3,p,label')]
        .filter(el => {
          const box = el.getBoundingClientRect(), css = getComputedStyle(el);
          return box.width > 0 && box.height > 0 && box.top < innerHeight && box.bottom > 0 &&
            box.left < innerWidth && box.right > 0 && css.visibility !== 'hidden' && Number(css.opacity) > 0;
        }).map((el, index) => {
          const box = el.getBoundingClientRect(), css = getComputedStyle(el), tag = el.tagName.toLowerCase();
          const parts = [];
          for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
            if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
            const siblings = node.parentElement ? [...node.parentElement.children].filter(s => s.tagName === node.tagName) : [node];
            parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')');
          }
          return { id: `web-${index}`, selector: parts.join(' > '), type: tag === 'button' ? 'button' : tag === 'a' ? 'link' :
            tag === 'img' ? 'image' : ['input','select','textarea'].includes(tag) ? 'input' : 'text',
            text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim(),
            x: box.x, y: box.y, width: box.width, height: box.height,
            style: { fontSize: parseFloat(css.fontSize), fontWeight: parseFloat(css.fontWeight),
              marginTop: parseFloat(css.marginTop), marginRight: parseFloat(css.marginRight),
              marginBottom: parseFloat(css.marginBottom), marginLeft: parseFloat(css.marginLeft),
              paddingTop: parseFloat(css.paddingTop), paddingRight: parseFloat(css.paddingRight),
              paddingBottom: parseFloat(css.paddingBottom), paddingLeft: parseFloat(css.paddingLeft),
              color: css.color, backgroundColor: css.backgroundColor, borderRadius: parseFloat(css.borderRadius) } };
        });
    });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const accessibilityIssues = results.violations.map(v => ({ rule: v.id, impact: v.impact,
      description: v.help, helpUrl: v.helpUrl, targets: v.nodes.map(n => n.target) }));
    const severity = { minor: 1, moderate: 3, serious: 6, critical: 10 };
    const penalty = accessibilityIssues.reduce((sum, v) => sum + (severity[v.impact] || 3) * Math.min(v.targets.length, 3), 0);
    return { elements, accessibility: { accessibilityScore: Math.max(0, 100 - penalty), accessibilityIssues,
      incompleteChecks: results.incomplete.map(v => ({ rule: v.id, targets: v.nodes.map(n => n.target) })),
      note: 'Automated checks only; this score does not guarantee full accessibility compliance.' } };
  } finally {
    await browser.close();
  }
}
module.exports = { analyzeWebpage };
