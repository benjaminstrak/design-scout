// scripts/setup-notion.js
const { Client } = require('@notionhq/client');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_API_KEY || !PARENT_PAGE_ID) {
  console.error('Set NOTION_API_KEY and NOTION_PARENT_PAGE_ID in your .env first');
  console.error('NOTION_PARENT_PAGE_ID = the page where you want the databases created');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function setup() {
  console.log('Creating Sources database...');
  const sourcesDb = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: 'Design Scout Sources' } }],
    properties: {
      'Name': { title: {} },
      'Email': { rich_text: {} },
      'Active': { checkbox: {} },
      'Tags': {
        multi_select: {
          options: [
            { name: 'Typography', color: 'blue' },
            { name: 'Industrial', color: 'green' },
            { name: 'Digital', color: 'purple' },
            { name: 'Architecture', color: 'orange' },
            { name: 'General', color: 'gray' },
          ],
        },
      },
    },
  });
  console.log(`Sources DB created: ${sourcesDb.id}`);

  console.log('Creating Briefings database...');
  const briefingsDb = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title: [{ type: 'text', text: { content: 'Design Scout Briefings' } }],
    properties: {
      'Title': { title: {} },
      'Date': { date: {} },
      'Status': {
        select: {
          options: [
            { name: 'New', color: 'blue' },
            { name: 'Reviewed', color: 'yellow' },
            { name: 'Used', color: 'green' },
          ],
        },
      },
      'Theme Tags': { multi_select: {} },
    },
  });
  console.log(`Briefings DB created: ${briefingsDb.id}`);

  console.log('\n=== SUCCESS ===');
  console.log('\nAdd these to your .env file:\n');
  console.log(`NOTION_SOURCES_DB_ID=${sourcesDb.id}`);
  console.log(`NOTION_BRIEFINGS_DB_ID=${briefingsDb.id}`);
}

setup().catch(console.error);
