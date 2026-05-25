// src/prompts/discover.js
// Builds the prompt for the Source Scout — finds design newsletters/sources
// the user may be missing, using Claude's web search tool.

function buildDiscoveryPrompt(existingNames) {
  const current = existingNames.length
    ? existingNames.map((n) => `- ${n}`).join('\n')
    : '(none yet)';

  return `You are a research scout for *Design Lobster*, a newsletter that draws surprising connections between objects, ideas, and history. Your job is to find **high-quality design newsletters, blogs, and similar regular sources** that the editor (Ben) is probably not subscribed to yet, and would genuinely benefit from.

Use web search to find current, real sources. Take your time and run several searches across different angles: independent design newsletters, design history and material culture, architecture and objects, typography and graphic design, craft, and writers/curators with a strong personal voice. Prefer sources that are still active in 2025–2026.

**Ben already subscribes to these — do NOT suggest any of them, or close duplicates:**
${current}

Find **6 to 8** sources he likely does NOT have. Favour:
- Independent, personal, or curated voices over corporate blogs.
- Sources rich in objects, history, and surprising connections (the Design Lobster sensibility).
- A spread across different niches, not 8 of the same kind.
- Things that genuinely exist and are active — you have web search, so verify rather than guess.

For each source, capture:
- "name": the source's name
- "url": the real signup or homepage URL (from your search results — never invent one)
- "why": one sentence on what makes it interesting
- "differs": one sentence on how it's different from what Ben already has
- "tags": 1–3 short lowercase tags (e.g. "typography", "design-history", "architecture")

When you have finished researching, output **only a JSON array** of these objects and nothing else — no preamble, no markdown code fences, no commentary after it. Example shape:

[{"name":"...","url":"https://...","why":"...","differs":"...","tags":["..."]}]

If you genuinely cannot find good new sources, output an empty array: []`;
}

module.exports = { buildDiscoveryPrompt };
