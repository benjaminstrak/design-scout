// src/stages/generate.js
const Anthropic = require('@anthropic-ai/sdk');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { buildGenerationPrompt } = require('../prompts/generate');

async function generate(config) {
  const analyzed = loadStageOutput('analyze');
  if (!analyzed) throw new Error('No analyze stage output found. Run Stage 3 first.');

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Generating structured briefing...');
  const prompt = buildGenerationPrompt(analyzed.data.analysis);
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  let briefing;
  try {
    const text = response.content[0].text;
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    briefing = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    briefing = { raw: response.content[0].text, parseError: err.message };
  }

  const output = {
    generateDate: new Date().toISOString(),
    briefing,
    stats: {
      ideasCount: briefing.ideas?.length || 0,
      objectsCount: briefing.objects?.length || 0,
      linksCount: briefing.links?.length || 0,
    },
  };

  const filePath = saveStageOutput('generate', output);
  console.log(`Saved to: ${filePath}`);
  console.log(`Stats: ${output.stats.ideasCount} ideas, ${output.stats.objectsCount} objects, ${output.stats.linksCount} links`);
  return output;
}

module.exports = generate;
