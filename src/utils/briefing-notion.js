// src/utils/briefing-notion.js
const { Client } = require('@notionhq/client');

async function createBriefingPage(config, briefing) {
  const notion = new Client({ auth: config.notion.apiKey });
  const today = new Date().toISOString().split('T')[0];
  const title = `Briefing - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

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

  const page = await notion.pages.create({
    parent: { database_id: config.notion.briefingsDbId },
    properties: {
      'Title': { title: [{ text: { content: title } }] },
      'Date': { date: { start: today } },
      'Status': { select: { name: 'New' } },
      'Theme Tags': { multi_select: (briefing.themes || []).map((t) => ({ name: t })) },
    },
    children,
  });
  return page.url;
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

module.exports = { createBriefingPage };
