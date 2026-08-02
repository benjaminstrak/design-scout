// src/stages/generate.js
const Anthropic = require('@anthropic-ai/sdk');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { buildGenerationPrompt } = require('../prompts/generate');

// Opus 5 thinks by default, so the first content block is often a thinking
// block rather than the answer. Always pick the text block out by type.
function textOf(response) {
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// Claude is asked to carry each object's imageUrl through, but it's a long URL
// in a long JSON blob: it sometimes drops one, and it sometimes retypes one
// slightly (a V&A link came back with the .jpg suffix missing). The archive
// results are right here and keyed by the same object URL, so treat them as the
// source of truth rather than trusting the model to copy a string exactly.
function backfillImages(briefing, archiveResults) {
  if (!briefing.objects?.length || !archiveResults?.length) return { filled: 0, corrected: 0 };
  const byUrl = new Map(archiveResults.filter((r) => r.url).map((r) => [r.url, r]));
  let filled = 0;
  let corrected = 0;
  for (const obj of briefing.objects) {
    const archiveImage = byUrl.get(obj.url)?.imageUrl;
    if (!archiveImage || archiveImage === obj.imageUrl) continue;
    if (obj.imageUrl) corrected += 1;
    else filled += 1;
    obj.imageUrl = archiveImage;
  }
  return { filled, corrected };
}

async function generate(config) {
  const analyzed = loadStageOutput('analyze');
  if (!analyzed) throw new Error('No analyze stage output found. Run Stage 3 first.');

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Generating structured briefing...');
  const prompt = buildGenerationPrompt(analyzed.data.analysis);
  const response = await anthropic.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: prompt }],
  });

  let briefing;
  const text = textOf(response);
  try {
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    briefing = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    briefing = { raw: text, parseError: err.message };
  }

  const { filled, corrected } = backfillImages(briefing, analyzed.data.archiveResults);
  if (filled || corrected) {
    console.log(`Object images: ${filled} filled in, ${corrected} corrected from archive results`);
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
