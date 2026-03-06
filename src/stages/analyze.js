// src/stages/analyze.js
const Anthropic = require('@anthropic-ai/sdk');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { searchAllArchives } = require('../utils/archives');
const { buildAnalysisPrompt } = require('../prompts/analyze');

async function analyze(config) {
  const extracted = loadStageOutput('extract');
  if (!extracted) throw new Error('No extract stage output found. Run Stage 2 first.');

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Identifying themes for archive search...');
  const themeResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Given these newsletter subjects and content snippets, identify 3-5 specific search keywords that would find interesting historical design objects in museum archives. Return ONLY a JSON array of strings, nothing else.

Subjects: ${extracted.data.results
  .flatMap((s) => s.emails.map((e) => e.subject))
  .join(', ')}`,
    }],
  });

  let searchKeywords;
  try {
    searchKeywords = JSON.parse(themeResponse.content[0].text);
  } catch {
    searchKeywords = ['industrial design', 'typography', 'furniture design'];
  }
  console.log(`Search keywords: ${searchKeywords.join(', ')}`);

  const allArchiveResults = [];
  for (const keyword of searchKeywords) {
    const results = await searchAllArchives(keyword, config, 2);
    allArchiveResults.push(...results);
  }
  console.log(`Total archive results: ${allArchiveResults.length}`);

  console.log('Running main analysis with Claude...');
  const prompt = buildAnalysisPrompt(extracted.data, allArchiveResults);
  const analysisResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = analysisResponse.content[0].text;
  const output = {
    analysisDate: new Date().toISOString(),
    searchKeywords,
    archiveResultCount: allArchiveResults.length,
    archiveResults: allArchiveResults,
    analysis,
  };

  const filePath = saveStageOutput('analyze', output);
  console.log(`Saved to: ${filePath}`);
  return output;
}

module.exports = analyze;
