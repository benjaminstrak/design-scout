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

module.exports = { getActiveSources };
