// src/prompts/generate.js
function buildGenerationPrompt(analysis) {
  return `You are formatting a Design Lobster newsletter briefing. Take the analysis below and produce a structured JSON output with exactly this format:

{
  "themes": ["tag1", "tag2", ...],
  "ideas": [
    {
      "title": "Short catchy title",
      "summary": "2-3 sentences explaining the idea and why it's interesting",
      "historicalConnection": "The surprising historical link",
      "draftAngle": "One sentence: how to approach this as a Design Lobster piece",
      "sources": ["url1", "url2"]
    }
  ],
  "objects": [
    {
      "title": "Object name",
      "source": "Museum name",
      "date": "When it's from",
      "description": "Why this object is interesting in a Design Lobster context",
      "contemporaryConnection": "How it connects to something modern",
      "url": "Link to the museum record",
      "imageUrl": "Image link if available"
    }
  ],
  "links": [
    {
      "title": "Article title",
      "url": "Article URL",
      "newsletter": "Which newsletter it came from",
      "commentary": "2-3 sentences on why it's worth reading and a Design Lobster angle"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanation
- 3-4 ideas, 2-3 objects, 3-5 links
- Keep the tone warm, curious, and specific
- Every item should feel like it could spark a Design Lobster issue

## ANALYSIS TO FORMAT

${analysis}`;
}

module.exports = { buildGenerationPrompt };
