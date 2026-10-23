require('dotenv').config();
const express = require('express');
const { analyzeWebpage } = require('./comparison/analyzeWebpage');
const { compareDesign } = require('./comparison/compareDesign');
const { explainResults } = require('./ai/explainResults');
const { makeFixes } = require('./changes/fixes');
const app = express();
app.use(express.json({ limit: '3mb' }));
app.get('/', (req, res) => res.send('Parity backend is running'));
app.post('/api/compare', async (req, res) => {
  try {
    const { websiteUrl, figmaData } = req.body || {};
    if (!websiteUrl || !figmaData?.elements?.length || !figmaData?.frame) {
      return res.status(400).json({ error: 'Provide websiteUrl and figmaData with a frame and elements' });
    }
    const page = await analyzeWebpage(websiteUrl, figmaData.frame);
    const design = compareDesign(figmaData, page);
    const ai = await explainResults(design, page.accessibility);
    res.json({ status: 'completed', ...design, ...page.accessibility, ...ai, fixes: makeFixes(design, page) });
  } catch (error) {
    res.status(422).json({ status: 'failed', error: error.message });
  }
});
app.post('/api/contrast', (req, res) => {
  try { res.json(require('./changes/contrast').contrast(req.body.foreground, req.body.background)); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
app.use('/api/github', require('./changes/routes'));
if (require.main === module) {
  app.listen(3000, '127.0.0.1', () => console.log('Parity: http://127.0.0.1:3000'));
}
module.exports = app;
