// src/utils/notion.js
// Note: Notion SDK v5 removed databases.query(), so we use the raw API via notion.request()
const { Client } = require('@notionhq/client');

async function getActiveSources(config) {
  const response = await queryDatabase(config.notion.apiKey, config.notion.sourcesDbId, {
    property: 'Active',
    checkbox: { equals: true },
  });
  return response.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text || 'Unknown',
      email: props.Email?.rich_text?.[0]?.plain_text || '',
      tags: props.Tags?.multi_select?.map((t) => t.name) || [],
    };
  });
}

// All source names (active or not), lowercased — used to avoid suggesting duplicates.
async function getAllSourceNames(config) {
  const response = await queryDatabase(config.notion.apiKey, config.notion.sourcesDbId, null);
  return response.results
    .map((page) => page.properties.Name?.title?.[0]?.plain_text || '')
    .filter(Boolean);
}

// Create an inactive "candidate" source row discovered by the Source Scout.
async function createSourceCandidate(config, { name, url, notes, tags = [] }) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.notion.apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: config.notion.sourcesDbId },
      properties: {
        Name: { title: [{ text: { content: name.slice(0, 200) } }] },
        Active: { checkbox: false },
        URL: url ? { url } : { url: null },
        Notes: { rich_text: [{ text: { content: (notes || '').slice(0, 1900) } }] },
        Tags: { multi_select: ['discovered', ...tags].map((t) => ({ name: t.slice(0, 100) })) },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Notion create candidate failed: ${err.message}`);
  }
  return res.json();
}

// Helper: query a Notion database using the raw REST API
// (works around SDK v5 removing databases.query)
async function queryDatabase(apiKey, databaseId, filter) {
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(filter ? { filter } : {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Notion query failed: ${err.message}`);
  }
  return res.json();
}

module.exports = { getActiveSources, getAllSourceNames, createSourceCandidate };
