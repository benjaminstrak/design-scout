// src/stages/analyze.js
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { searchAllArchives } = require('../utils/archives');
const { buildAnalysisPrompt } = require('../prompts/analyze');

// Opus 5.5 always "thinks" first, so the reply is a list of blocks (thinking + text).
// Grab only the text blocks — that's the actual answer.
function getText(response) {
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
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
    model: 'claude-opus-5-5',
    // max_tokens includes thinking, so leave headroom beyond the short answer
    max_tokens: 4000,
    // effort = how hard Claude thinks (low | medium | high | xhigh | max). Simple task → medium.
    output_config: { effort: 'medium' },
    messages: [{
      role: 'user',
      content: `Given these newsletter subjects and content snippets, identify 3-5 specific search keywords that would find interesting historical design objects in museum archives. Return ONLY a JSON array of strings, no markdown, no explanation, just the raw JSON array.

Subjects: ${extracted.data.results
  .flatMap((s) => s.emails.map((e) => e.subject))
  .join(', ')}`,
    }],
  });

  const rawThemeText = getText(themeResponse);
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
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // The core creative step — worth thinking harder. Try 'xhigh' if connections feel shallow.
    output_config: { effort: 'high' },
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = getText(analysisResponse);
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
