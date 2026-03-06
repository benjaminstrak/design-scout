// src/index.js
// This is the main entry point. It runs each pipeline stage in order.
// Each stage reads from the previous stage's JSON output and writes
// its own JSON output. If a stage fails, the previous outputs are
// still available so you can re-run from where it broke.

const config = require('./config');

async function runPipeline() {
  console.log('=== Design Scout Pipeline ===');
  console.log(`Started at: ${new Date().toISOString()}`);

  // Stage 1: Collect emails from newsletter sources
  console.log('\n--- Stage 1: Collect ---');
  // const collected = await require('./stages/collect')(config);

  // Stage 2: Extract content from emails and linked articles
  console.log('\n--- Stage 2: Extract ---');
  // const extracted = await require('./stages/extract')(config);

  // Stage 3: Analyze content with Claude + museum APIs
  console.log('\n--- Stage 3: Analyze ---');
  // const analyzed = await require('./stages/analyze')(config);

  // Stage 4: Generate structured briefing
  console.log('\n--- Stage 4: Generate ---');
  // const briefing = await require('./stages/generate')(config);

  // Stage 5: Deliver to Notion + email
  console.log('\n--- Stage 5: Deliver ---');
  // await require('./stages/deliver')(config);

  console.log('\n=== Pipeline Complete ===');
}

runPipeline().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
