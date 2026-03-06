// src/stages/deliver.js
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { createBriefingPage } = require('../utils/briefing-notion');
const { buildEmailHtml, sendBriefingEmail } = require('../utils/briefing-email');

async function deliver(config) {
  const generated = loadStageOutput('generate');
  if (!generated) throw new Error('No generate stage output found. Run Stage 4 first.');

  const briefing = generated.data.briefing;

  console.log('Creating Notion briefing page...');
  const notionUrl = await createBriefingPage(config, briefing);
  console.log(`Notion page created: ${notionUrl}`);

  console.log('Sending briefing email...');
  const stats = {
    newslettersScanned: generated.data.stats?.ideasCount || 0,
    archivesSearched: 8,
  };
  const emailHtml = buildEmailHtml(briefing, notionUrl, stats);
  await sendBriefingEmail(config, emailHtml);

  const output = {
    deliveryDate: new Date().toISOString(),
    notionUrl,
    emailSent: true,
    recipient: config.briefing.recipientEmail,
  };
  const filePath = saveStageOutput('deliver', output);
  console.log(`Saved to: ${filePath}`);
  return output;
}

module.exports = deliver;
