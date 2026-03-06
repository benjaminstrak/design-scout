// src/stages/extract.js
const cheerio = require('cheerio');
const { extractLinksFromEmail, extractArticleContent } = require('../utils/scraper');
const { saveStageOutput, loadStageOutput } = require('../utils/data');

async function extract(config) {
  const collected = loadStageOutput('collect');
  if (!collected) throw new Error('No collect stage output found. Run Stage 1 first.');

  const results = [];
  for (const sourceGroup of collected.data.results) {
    const sourceResults = { source: sourceGroup.source, emails: [] };
    for (const email of sourceGroup.emails) {
      console.log(`Processing: "${email.subject}"`);
      const emailText = email.bodyText || (email.bodyHtml ? cheerio.load(email.bodyHtml).text().trim() : '');
      const links = extractLinksFromEmail(email.bodyHtml);
      console.log(`  Found ${links.length} content links`);
      const maxLinks = Math.min(links.length, 5);
      const articles = [];
      for (let i = 0; i < maxLinks; i++) {
        console.log(`  Fetching: ${links[i].substring(0, 60)}...`);
        const article = await extractArticleContent(links[i]);
        if (article.error) console.log(`    Error: ${article.error}`);
        else console.log(`    Got: "${article.title}" (${article.text.length} chars)`);
        articles.push(article);
        await new Promise((r) => setTimeout(r, 500));
      }
      sourceResults.emails.push({
        id: email.id, subject: email.subject, from: email.from, date: email.date,
        emailText: emailText.substring(0, 3000), links, articles,
      });
    }
    results.push(sourceResults);
  }

  const output = {
    extractDate: new Date().toISOString(),
    totalEmails: results.reduce((sum, s) => sum + s.emails.length, 0),
    totalArticles: results.reduce((sum, s) => sum + s.emails.reduce((eSum, e) => eSum + e.articles.length, 0), 0),
    results,
  };
  const filePath = saveStageOutput('extract', output);
  console.log(`Saved to: ${filePath}`);
  return output;
}

module.exports = extract;
