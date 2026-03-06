// src/stages/collect.js
const { getActiveSources } = require('../utils/notion');
const { createGmailClient, getEmailsFromSender } = require('../utils/gmail');
const { saveStageOutput, loadStageOutput } = require('../utils/data');

async function collect(config) {
  console.log('Fetching sources from Notion...');
  const sources = await getActiveSources(config);
  console.log(`Found ${sources.length} active sources`);

  const lastRun = loadStageOutput('collect');
  const afterDate = lastRun
    ? lastRun.timestamp.split('T')[0]
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`Scanning emails since: ${afterDate}`);

  const gmail = createGmailClient(config);
  const allEmails = [];

  for (const source of sources) {
    if (!source.email) {
      console.log(`Skipping "${source.name}" - no email address set`);
      continue;
    }
    console.log(`Scanning: ${source.name} (${source.email})`);
    const emails = await getEmailsFromSender(gmail, source.email, afterDate);
    console.log(`  Found ${emails.length} emails`);
    allEmails.push({ source, emails });
  }

  const output = {
    scanDate: new Date().toISOString(),
    afterDate,
    sourcesScanned: sources.length,
    totalEmails: allEmails.reduce((sum, s) => sum + s.emails.length, 0),
    results: allEmails,
  };

  const filePath = saveStageOutput('collect', output);
  console.log(`Saved to: ${filePath}`);
  return output;
}

module.exports = collect;
