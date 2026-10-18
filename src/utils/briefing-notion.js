// src/utils/briefing-notion.js
const { Client } = require('@notionhq/client');

async function createBriefingPage(config, briefing) {
  const notion = new Client({ auth: config.notion.apiKey });
  const today = new Date().toISOString().split('T')[0];
  // The Date property already carries the date, so a dated title told us
  // nothing. Use what the briefing is actually about, and only fall back to the
  // dated form if the model didn't supply one.
  const title = (briefing.briefingTitle || '').trim()
    || briefing.ideas?.[0]?.title?.trim()
    || `Briefing - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const children = [];

  children.push(heading2('Ideas to Think About'));
  for (const idea of (briefing.ideas || [])) {
    children.push(heading3(idea.title));
    children.push(paragraph(idea.summary));
    children.push(paragraph(`Historical connection: ${idea.historicalConnection}`));
    children.push(callout(`Draft angle: ${idea.draftAngle}`));
    if (idea.sources?.length) children.push(paragraph(`Sources: ${idea.sources.join(', ')}`));
    children.push(divider());
  }

  children.push(heading2('Objects'));
  for (const obj of (briefing.objects || [])) {
    children.push(heading3(`${obj.title} (${obj.source}, ${obj.date})`));
    if (isDisplayableImage(obj.imageUrl)) children.push(image(obj.imageUrl));
    children.push(paragraph(obj.description));
    children.push(paragraph(`Contemporary connection: ${obj.contemporaryConnection}`));
    if (obj.url) children.push(bookmark(obj.url));
    children.push(divider());
  }

  children.push(heading2('Interesting Links'));
  for (const link of (briefing.links || [])) {
    children.push(heading3(link.title));
    children.push(paragraph(`via ${link.newsletter}`));
    children.push(paragraph(link.commentary));
    if (link.url) children.push(bookmark(link.url));
    children.push(divider());
  }

  const properties = {
    'Title': { title: [{ text: { content: title } }] },
    'Date': { date: { start: today } },
    'Status': { select: { name: 'New' } },
    'Theme Tags': { multi_select: (briefing.themes || []).map((t) => ({ name: t })) },
  };
  const parent = { database_id: config.notion.briefingsDbId };

  try {
    const page = await notion.pages.create({ parent, properties, children });
    return page.url;
  } catch (err) {
    // Notion fetches external images server-side and rejects the whole request
    // if one won't load. The briefing matters more than the pictures, so drop
    // them and try once more rather than losing the page entirely.
    if (!children.some((b) => b.type === 'image')) throw err;
    console.warn(`Notion rejected the page with images (${err.message}); retrying without them`);
    const withoutImages = children.filter((b) => b.type !== 'image');
    const page = await notion.pages.create({ parent, properties, children: withoutImages });
    return page.url;
  }
}

// Notion will only embed an external image it can fetch itself over https.
function isDisplayableImage(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url);
}

function heading2(text) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: text } }] } };
}
function heading3(text) {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: text } }] } };
}
function paragraph(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: text } }] } };
}
function callout(text) {
  return { object: 'block', type: 'callout', callout: { rich_text: [{ type: 'text', text: { content: text } }], icon: { type: 'emoji', emoji: '💡' } } };
}
function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}
function bookmark(url) {
  return { object: 'block', type: 'bookmark', bookmark: { url } };
}
function image(url) {
  return { object: 'block', type: 'image', image: { type: 'external', external: { url } } };
}

module.exports = { createBriefingPage };
