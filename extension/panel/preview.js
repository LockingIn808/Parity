/* Load in the DevTools panel before the React bundle. No UI is supplied here. */
(() => {
  const evaluate = code => new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(code, (result, error) => {
      if (error) reject(new Error(error.description || error.value || 'Preview failed'));
      else if (result?.error) reject(new Error(result.error));
      else resolve(result);
    });
  });
  const styleId = '__parity_reviewed_preview__';
  window.ParityPreview = {
    // Pass the exact plan returned by POST /api/github/plan.
    apply(plan) {
      if (!plan?.id || !plan.css || !Array.isArray(plan.files)) return Promise.reject(new Error('Prepare a plan first'));
      return evaluate(`(() => {
        const plan = ${JSON.stringify({ id: plan.id, css: plan.css, websiteUrl: plan.websiteUrl })};
        if (location.href !== plan.websiteUrl) return {error: 'Open the exact webpage used for this plan'};
        let style = document.getElementById(${JSON.stringify(styleId)});
        if (style && style.tagName !== 'STYLE') return {error: 'Preview element ID is already in use'};
        if (!style) { style = document.createElement('style'); style.id = ${JSON.stringify(styleId)}; document.head.append(style); }
        style.textContent = plan.css;
        return { applied: true, planId: plan.id };
      })()`);
    },
    undo() {
      return evaluate(`(() => { const style = document.getElementById(${JSON.stringify(styleId)}); if (style?.tagName === 'STYLE') style.remove(); return {undone: true}; })()`);
    }
  };
})();
