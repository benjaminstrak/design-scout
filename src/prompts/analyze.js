// src/prompts/analyze.js
// The prompt that tells Claude how to analyze newsletter content
// and find surprising Design Lobster-style connections.
// This is THE most important file in the project.

function buildAnalysisPrompt(extractedData, archiveResults) {
  const newsletterSummary = extractedData.results
    .map((sourceGroup) => {
      const sourceName = sourceGroup.source.name;
      return sourceGroup.emails.map((email) => {
        const articleSummaries = email.articles
          .filter((a) => a.text && !a.error)
          .map((a) => `  - "${a.title}": ${a.text.substring(0, 500)}`)
          .join('\n');
        return `FROM: ${sourceName}\nSUBJECT: ${email.subject}\nDATE: ${email.date}\nEMAIL CONTENT:\n${email.emailText?.substring(0, 1000) || '(no text)'}\nLINKED ARTICLES:\n${articleSummaries || '  (none)'}`;
      }).join('\n\n---\n\n');
    })
    .join('\n\n===\n\n');

  const archiveSummary = archiveResults
    .map((item) => {
      const image = item.imageUrl ? `\nIMAGE: ${item.imageUrl}` : '';
      return `[${item.source}] "${item.title}" (${item.date}) — ${item.description}\nURL: ${item.url}${image}`;
    })
    .join('\n\n');

  return `You are helping write Design Lobster, a biweekly newsletter by Ben Strak that tells "surprising stories from the world of design." It has 7,000+ subscribers who love unexpected angles on design.

Design Lobster's style:
- Curious, accessible tone — never academic or jargon-heavy
- Finds the surprising story behind everyday objects and design decisions
- Connects current design trends to unexpected historical precedents
- Covers forgotten designers, cross-cultural design comparisons, and origin stories
- Each issue usually has a main essay plus curated interesting links

## YOUR TASK

Analyze the following newsletter content and archive material. Produce a structured briefing with three sections:

### 1. IDEAS TO THINK ABOUT (3-4 ideas)
Look across all the newsletters for underlying themes, recurring topics, or contrarian angles. Each idea should be:
- A potential jumping-off point for a short essay
- Connected to a historical precedent or surprising origin story
- Framed as a question or provocative observation
- Include a suggested "draft angle" — one sentence describing how Ben could approach this as a Design Lobster piece

### 2. OBJECTS (2-3 objects)
From the archive results below, pick the most interesting objects that connect to themes in the newsletters. Where two candidates are equally good, prefer the one with an IMAGE — but never pick a duller object just because it has a picture. For each:
- Explain WHY this object is interesting in a Design Lobster context
- Connect it to something contemporary
- Include the source and URL
- If the archive entry has an IMAGE line, reproduce that image URL exactly — Ben wants to see the object, not just read about it

### 3. INTERESTING LINKS (3-5 links)
From the newsletter articles, pick the best/most interesting links. For each:
- Write a brief commentary on why it's worth reading
- Note which newsletter it came from
- Suggest a Design Lobster angle if there is one

## NEWSLETTER CONTENT

${newsletterSummary}

## ARCHIVE MATERIAL

${archiveSummary}

## IMPORTANT
- Be specific, not generic. "Design is everywhere" is not an insight.
- Prioritize surprising connections over obvious ones.
- Write in a warm, curious tone matching Design Lobster's voice.
- If a theme appears in multiple newsletters, that's a signal it's worth exploring.
- Always cite your sources with URLs.`;
}

module.exports = { buildAnalysisPrompt };
