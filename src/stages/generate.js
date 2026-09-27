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
    model: 'claude-opus-5-5',
    // max_tokens includes thinking, so leave plenty of room for the full briefing JSON
    max_tokens: 16000,
    // effort = how hard Claude thinks (low | medium | high | xhigh | max)
    output_config: { effort: 'high' },
    messages: [{ role: 'user', content: prompt }],
  });

  // Opus 5.5 always "thinks" first, so skip the thinking blocks and keep only the text answer
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

  let briefing;
  try {
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    briefing = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    briefing = { raw: text, parseError: err.message };
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
