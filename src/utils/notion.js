// src/utils/notion.js
const { Client } = require('@notionhq/client');

async function getActiveSources(config) {
  const notion = new Client({ auth: config.notion.apiKey });
  const response = await notion.databases.query({
    database_id: config.notion.sourcesDbId,
    filter: {
      property: 'Active',
      checkbox: { equals: true },
    },
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

module.exports = { getActiveSources };
