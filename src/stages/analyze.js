// src/stages/analyze.js
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { searchAllArchives } = require('../utils/archives');
const { buildAnalysisPrompt } = require('../prompts/analyze');

// Opus 5 thinks by default, so the first content block is often a thinking
// block rather than the answer. Always pick the text block out by type.
function textOf(response) {
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// Load URLs of objects already used in previous briefings, so we can exclude them.
function loadSeenObjectUrls() {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) return new Set();
  const seen = new Set();
  const files = fs.readdirSync(dataDir).filter((f) => f.startsWith('generate-') && f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const objects = raw.data?.briefing?.objects || [];
      for (const obj of objects) {
        if (obj.url) seen.add(obj.url);
      }
    } catch {
      // skip malformed files
    }
  }
  console.log(`Seen objects filter: ${seen.size} URLs excluded from previous briefings`);
  return seen;
}

async function analyze(config) {
  const extracted = loadStageOutput('extract');
  if (!extracted) throw new Error('No extract stage output found. Run Stage 2 first.');

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Identifying themes for archive search...');
  const themeResponse = await anthropic.messages.create({
    model: 'claude-opus-5',
    // Generous ceiling: max_tokens caps thinking *and* the answer, and a tight
    // cap here would spend the whole budget thinking and return empty text.
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    messages: [{
      role: 'user',
      content: `Given these newsletter subjects and content snippets, identify 3-5 specific search keywords that would find interesting historical design objects in museum archives. Return ONLY a JSON array of strings, no markdown, no explanation, just the raw JSON array.

Subjects: ${extracted.data.results
  .flatMap((s) => s.emails.map((e) => e.subject))
  .join(', ')}`,
    }],
  });

  const rawThemeText = textOf(themeResponse);
  console.log(`Raw theme response: ${rawThemeText}`);

  let searchKeywords;
  try {
    // Strip markdown code fences if Claude wrapped the response anyway
    const cleaned = rawThemeText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    searchKeywords = JSON.parse(cleaned);
    if (!Array.isArray(searchKeywords) || searchKeywords.length === 0) throw new Error('Not a valid array');
    console.log(`Parsed keywords: ${searchKeywords.join(', ')}`);
  } catch (err) {
    console.warn(`Failed to parse theme keywords (${err.message}), using fallback`);
    searchKeywords = ['industrial design', 'typography', 'furniture design'];
  }

  // Load seen object URLs to avoid repeating previous briefings
  const seenUrls = loadSeenObjectUrls();

  const allArchiveResults = [];
  for (const keyword of searchKeywords) {
    const results = await searchAllArchives(keyword, config, 2);
    allArchiveResults.push(...results);
  }
  console.log(`Total archive results before dedup: ${allArchiveResults.length}`);

  // Filter out objects already used in previous briefings
  const freshArchiveResults = allArchiveResults.filter((item) => !seenUrls.has(item.url));
  console.log(`Archive results after seen-objects filter: ${freshArchiveResults.length}`);

  console.log('Running main analysis with Claude...');
  const prompt = buildAnalysisPrompt(extracted.data, freshArchiveResults);
  const analysisResponse = await anthropic.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = textOf(analysisResponse);
  const output = {
    analysisDate: new Date().toISOString(),
    searchKeywords,
    archiveResultCount: freshArchiveResults.length,
    archiveResults: freshArchiveResults,
    analysis,
  };

  const filePath = saveStageOutput('analyze', output);
  console.log(`Saved to: ${filePath}`);
  return output;
}

module.exports = analyze;
