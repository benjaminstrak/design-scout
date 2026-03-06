// src/index.js
const config = require('./config');

async function runPipeline() {
  console.log('=== Design Scout Pipeline ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    console.log('--- Stage 1: Collect ---');
    const collect = require('./stages/collect');
    const collected = await collect(config);
    console.log(`Collected ${collected.totalEmails} emails from ${collected.sourcesScanned} sources\n`);

    console.log('--- Stage 2: Extract ---');
    const extract = require('./stages/extract');
    const extracted = await extract(config);
    console.log(`Extracted content from ${extracted.totalEmails} emails, ${extracted.totalArticles} articles\n`);

    console.log('--- Stage 3: Analyze ---');
    const analyze = require('./stages/analyze');
    const analyzed = await analyze(config);
    console.log(`Analysis complete. ${analyzed.archiveResultCount} archive results found\n`);

    console.log('--- Stage 4: Generate ---');
    const generate = require('./stages/generate');
    const generated = await generate(config);
    console.log(`Briefing generated: ${generated.stats.ideasCount} ideas, ${generated.stats.objectsCount} objects, ${generated.stats.linksCount} links\n`);

    console.log('--- Stage 5: Deliver ---');
    const deliver = require('./stages/deliver');
    const delivered = await deliver(config);
    console.log(`Delivered: ${delivered.notionUrl}\n`);

    console.log('=== Pipeline Complete ===');
  } catch (err) {
    console.error('\n!!! Pipeline failed !!!');
    console.error(err);
    process.exit(1);
  }
}

runPipeline();
