// src/discover.js
// Source Scout — a standalone agent that web-researches design newsletters/sources
// the user may be missing, emails a shortlist, and logs them to Notion as candidates.
//
// Usage:
//   node src/discover.js            (full run: email + Notion)
//   node src/discover.js --dry-run  (research only; print results, no email/Notion)
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');
const { getAllSourceNames, createSourceCandidate } = require('./utils/notion');
const { buildDiscoveryPrompt } = require('./prompts/discover');
const { buildDiscoveryHtml, sendDiscoveryEmail } = require('./utils/discovery-email');
const { saveStageOutput } = require('./utils/data');

// Pull a JSON array out of the model's final text, tolerating code fences/prose.
function parseDiscoveries(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in model output');
  }
  return JSON.parse(text.slice(start, end + 1));
}

// Web search spikes input-token usage and can trip the per-minute rate limit.
// Retry a 429 after waiting out the window (the limit resets each minute).
async function createWithRetry(anthropic, params, maxRetries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries) {
        const waitMs = 65000;
        console.log(`Rate limited; waiting ${waitMs / 1000}s then retrying (${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}

function isDuplicate(name, existingLower) {
  const n = name.toLowerCase().trim();
  return existingLower.some((e) => e === n || e.includes(n) || n.includes(e));
}

async function discover(config, { dryRun = false } = {}) {
  console.log('Source Scout starting...');
  const existing = await getAllSourceNames(config);
  console.log(`Known sources: ${existing.length}`);

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  console.log('Researching new sources via web search (this can take a minute)...');
  const response = await createWithRetry(anthropic, {
    model: 'claude-opus-5-5',
    // max_tokens includes Opus 5.5's thinking, so leave room on top of the final answer
    max_tokens: 16000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: buildDiscoveryPrompt(existing) }],
  });

  const searches = response.usage?.server_tool_use?.web_search_requests ?? 0;
  const finalText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  console.log(`Web searches run: ${searches}`);

  let discoveries = parseDiscoveries(finalText);

  // Drop anything that matches an existing source name.
  const existingLower = existing.map((e) => e.toLowerCase().trim());
  const before = discoveries.length;
  discoveries = discoveries.filter((d) => d.name && d.url && !isDuplicate(d.name, existingLower));
  console.log(`Discoveries: ${discoveries.length} (filtered ${before - discoveries.length} dupes/invalid)`);

  if (discoveries.length === 0) {
    console.log('No new sources found this run.');
    return { discoveries: [], searches };
  }

  for (const d of discoveries) {
    console.log(`  - ${d.name} (${d.url})`);
  }

  if (dryRun) {
    console.log('\n[dry-run] Skipping Notion writes and email.');
    return { discoveries, searches, dryRun: true };
  }

  // Write Notion candidates (per-item, so one failure doesn't sink the rest).
  let added = 0;
  for (const d of discoveries) {
    try {
      await createSourceCandidate(config, {
        name: d.name,
        url: d.url,
        notes: `Why: ${d.why || ''}\nDiffers: ${d.differs || ''}`,
        tags: Array.isArray(d.tags) ? d.tags : [],
      });
      added++;
    } catch (err) {
      console.warn(`  ! Notion write failed for "${d.name}": ${err.message}`);
    }
  }
  console.log(`Added ${added} candidate(s) to Notion.`);

  // Email the shortlist.
  const html = buildDiscoveryHtml(discoveries);
  await sendDiscoveryEmail(config, html, discoveries.length);

  const output = {
    discoveryDate: new Date().toISOString(),
    searches,
    knownSources: existing.length,
    discoveries,
    notionAdded: added,
  };
  saveStageOutput('discover', output);
  return output;
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  discover(config, { dryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Source Scout failed:', err.message);
      process.exit(1);
    });
}

module.exports = discover;
