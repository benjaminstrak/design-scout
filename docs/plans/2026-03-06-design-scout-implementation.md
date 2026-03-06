# Design Scout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated pipeline that scans newsletter emails, finds surprising design connections via museum APIs, and delivers structured briefings via email + Notion.

**Architecture:** Five-stage pipeline (Collect → Extract → Analyze → Generate → Deliver), each stage independent and saving output to JSON. Notion as source of truth for newsletter sources. Claude API as the analysis brain. Deployed to Railway.app with cron scheduling, designed to swap to local Mac Mini cron later.

**Tech Stack:** Node.js, Gmail API (OAuth2), @notionhq/client, @anthropic-ai/sdk, Cheerio, Nodemailer

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/index.js` (pipeline entry point)
- Create: `src/config.js` (env var loader)

**Step 1: Initialize the project**

```bash
cd "/Users/benstrak/Coding/Design Scout"
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install googleapis @notionhq/client @anthropic-ai/sdk cheerio nodemailer dotenv
```

**Step 3: Create .gitignore**

```
node_modules/
.env
data/
```

**Step 4: Create .env.example**

```env
# Gmail OAuth2
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_USER_EMAIL=

# Notion
NOTION_API_KEY=
NOTION_SOURCES_DB_ID=
NOTION_BRIEFINGS_DB_ID=

# Anthropic
ANTHROPIC_API_KEY=

# Museum APIs (Tier 2 - optional, need free registration)
EUROPEANA_API_KEY=
HARVARD_ART_MUSEUMS_API_KEY=

# Briefing Config
BRIEFING_RECIPIENT_EMAIL=
SCHEDULE_DAYS=3
```

**Step 5: Create src/config.js**

```javascript
// src/config.js
// Loads environment variables and exports them as a config object.
// Every part of the pipeline imports config from here instead of
// reading process.env directly. This keeps things in one place.

require('dotenv').config();

module.exports = {
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    userEmail: process.env.GMAIL_USER_EMAIL,
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    sourcesDbId: process.env.NOTION_SOURCES_DB_ID,
    briefingsDbId: process.env.NOTION_BRIEFINGS_DB_ID,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  museums: {
    europeanaKey: process.env.EUROPEANA_API_KEY || null,
    harvardKey: process.env.HARVARD_ART_MUSEUMS_API_KEY || null,
  },
  briefing: {
    recipientEmail: process.env.BRIEFING_RECIPIENT_EMAIL,
    scheduleDays: parseInt(process.env.SCHEDULE_DAYS || '3', 10),
  },
};
```

**Step 6: Create src/index.js (pipeline skeleton)**

```javascript
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
```

**Step 7: Create data directory**

```bash
mkdir -p data
```

**Step 8: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold project with dependencies and config"
```

---

### Task 2: Data Utilities (JSON read/write helpers)

**Files:**
- Create: `src/utils/data.js`
- Create: `src/utils/data.test.js`

**Step 1: Write the test**

```javascript
// src/utils/data.test.js
const fs = require('fs');
const path = require('path');
const { saveStageOutput, loadStageOutput } = require('./data');

// We'll use a temporary directory for tests
const TEST_DIR = path.join(__dirname, '../../data/test');

beforeEach(() => {
  // Create test directory if it doesn't exist
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up test files
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test('saveStageOutput writes JSON file with timestamp', () => {
  const data = { items: [{ title: 'Test Item' }] };
  const filePath = saveStageOutput('collect', data, TEST_DIR);

  expect(fs.existsSync(filePath)).toBe(true);

  const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  expect(saved.stage).toBe('collect');
  expect(saved.data).toEqual(data);
  expect(saved.timestamp).toBeDefined();
});

test('loadStageOutput reads the most recent file for a stage', () => {
  const data1 = { items: ['old'] };
  const data2 = { items: ['new'] };

  saveStageOutput('collect', data1, TEST_DIR);
  // Small delay to ensure different timestamps
  saveStageOutput('collect', data2, TEST_DIR);

  const loaded = loadStageOutput('collect', TEST_DIR);
  expect(loaded.data).toEqual(data2);
});

test('loadStageOutput returns null if no file exists', () => {
  const loaded = loadStageOutput('nonexistent', TEST_DIR);
  expect(loaded).toBeNull();
});
```

**Step 2: Install test runner**

```bash
npm install --save-dev jest
```

Add to package.json scripts: `"test": "jest"`

**Step 3: Run test to verify it fails**

```bash
npx jest src/utils/data.test.js --verbose
```

Expected: FAIL (module not found)

**Step 4: Write the implementation**

```javascript
// src/utils/data.js
// Helpers for saving and loading stage output as JSON files.
// Each stage writes a timestamped JSON file to the data/ directory.
// This means if something fails at stage 3, stages 1 and 2 don't
// need to run again — their output is already saved.

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '../../data');

/**
 * Save the output of a pipeline stage to a JSON file.
 * Files are named like: collect-2026-03-06T10-30-00.json
 *
 * @param {string} stageName - e.g. 'collect', 'extract', 'analyze'
 * @param {object} data - the stage's output data
 * @param {string} dir - directory to save to (defaults to data/)
 * @returns {string} the file path that was written
 */
function saveStageOutput(stageName, data, dir = DEFAULT_DIR) {
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${stageName}-${timestamp}.json`;
  const filePath = path.join(dir, filename);

  const output = {
    stage: stageName,
    timestamp: new Date().toISOString(),
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return filePath;
}

/**
 * Load the most recent output file for a given stage.
 * Finds all files matching the stage name and returns the newest one.
 *
 * @param {string} stageName - e.g. 'collect', 'extract'
 * @param {string} dir - directory to load from (defaults to data/)
 * @returns {object|null} the parsed JSON, or null if no file exists
 */
function loadStageOutput(stageName, dir = DEFAULT_DIR) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(`${stageName}-`) && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first (timestamps sort alphabetically)

  if (files.length === 0) return null;

  const filePath = path.join(dir, files[0]);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

module.exports = { saveStageOutput, loadStageOutput };
```

**Step 5: Run test to verify it passes**

```bash
npx jest src/utils/data.test.js --verbose
```

Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add src/utils/ package.json
git commit -m "feat: add data utilities for stage JSON read/write"
```

---

### Task 3: Stage 1 - Collect (Notion sources + Gmail scan)

**Files:**
- Create: `src/stages/collect.js`
- Create: `src/utils/notion.js`
- Create: `src/utils/gmail.js`

**Step 1: Create the Notion utility**

```javascript
// src/utils/notion.js
// Reads the Sources Database from Notion to get the list of
// newsletter email addresses we should scan Gmail for.
// The Sources DB is managed by the user in Notion — they add/remove
// newsletters there and this code just reads it.

const { Client } = require('@notionhq/client');

/**
 * Fetch all active newsletter sources from the Notion database.
 *
 * @param {object} config - the app config object
 * @returns {Array<{name: string, email: string, tags: string[]}>}
 */
async function getActiveSources(config) {
  const notion = new Client({ auth: config.notion.apiKey });

  // Query the Sources DB, filtering for rows where Active is checked
  const response = await notion.databases.query({
    database_id: config.notion.sourcesDbId,
    filter: {
      property: 'Active',
      checkbox: { equals: true },
    },
  });

  // Map Notion's complex property format into simple objects
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
```

**Step 2: Create the Gmail utility**

```javascript
// src/utils/gmail.js
// Connects to Gmail via OAuth2 and searches for emails from
// specific senders. We use the Gmail API (not IMAP) because
// it gives us structured access to email content.
//
// SETUP NOTE: You need OAuth2 credentials from Google Cloud Console.
// See docs/setup-gmail.md for step-by-step instructions.

const { google } = require('googleapis');

/**
 * Create an authenticated Gmail API client using OAuth2.
 * The refresh token is long-lived, so once set up this
 * just works without user interaction.
 */
function createGmailClient(config) {
  const auth = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret
  );
  auth.setCredentials({ refresh_token: config.gmail.refreshToken });
  return google.gmail({ version: 'v1', auth });
}

/**
 * Search Gmail for emails from a specific sender, received after
 * a given date.
 *
 * @param {object} gmail - authenticated Gmail API client
 * @param {string} senderEmail - email address to search for
 * @param {string} afterDate - ISO date string (e.g. '2026-03-03')
 * @returns {Array<{id, subject, from, date, bodyHtml, bodyText}>}
 */
async function getEmailsFromSender(gmail, senderEmail, afterDate) {
  // Gmail search query: from this sender, after this date
  const query = `from:${senderEmail} after:${afterDate}`;

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10, // Cap per sender per run
  });

  const messageIds = listResponse.data.messages || [];
  const emails = [];

  for (const msg of messageIds) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const headers = detail.data.payload.headers;
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const date = headers.find((h) => h.name === 'Date')?.value || '';

    // Extract body — Gmail nests parts differently depending on
    // whether the email is plain text, HTML, or multipart
    const body = extractBody(detail.data.payload);

    emails.push({
      id: msg.id,
      subject,
      from,
      date,
      bodyHtml: body.html,
      bodyText: body.text,
    });
  }

  return emails;
}

/**
 * Recursively extract the email body from Gmail's payload structure.
 * Newsletters are usually HTML, but we grab both formats.
 */
function extractBody(payload) {
  let html = '';
  let text = '';

  if (payload.parts) {
    for (const part of payload.parts) {
      const partBody = extractBody(part);
      html = html || partBody.html;
      text = text || partBody.text;
    }
  } else if (payload.body?.data) {
    // Gmail encodes body data as URL-safe base64
    const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    if (payload.mimeType === 'text/html') {
      html = decoded;
    } else if (payload.mimeType === 'text/plain') {
      text = decoded;
    }
  }

  return { html, text };
}

module.exports = { createGmailClient, getEmailsFromSender };
```

**Step 3: Create the Collect stage**

```javascript
// src/stages/collect.js
// STAGE 1: COLLECT
// Reads active newsletter sources from Notion, then scans Gmail
// for recent emails from each source. Saves all found emails
// to a JSON file for the next stage to process.

const { getActiveSources } = require('../utils/notion');
const { createGmailClient, getEmailsFromSender } = require('../utils/gmail');
const { saveStageOutput, loadStageOutput } = require('../utils/data');

/**
 * @param {object} config - app config
 * @returns {object} collected data with sources and emails
 */
async function collect(config) {
  // 1. Get the list of newsletters to scan from Notion
  console.log('Fetching sources from Notion...');
  const sources = await getActiveSources(config);
  console.log(`Found ${sources.length} active sources`);

  // 2. Figure out when we last ran, so we only get new emails
  const lastRun = loadStageOutput('collect');
  const afterDate = lastRun
    ? lastRun.timestamp.split('T')[0] // Just the date part
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days ago
        .toISOString().split('T')[0];

  console.log(`Scanning emails since: ${afterDate}`);

  // 3. Scan Gmail for each source
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

    allEmails.push({
      source,
      emails,
    });
  }

  // 4. Save output for the next stage
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
```

**Step 4: Commit**

```bash
git add src/stages/collect.js src/utils/notion.js src/utils/gmail.js
git commit -m "feat: add Stage 1 (Collect) - Notion sources + Gmail scan"
```

---

### Task 4: Stage 2 - Extract (parse emails + follow links)

**Files:**
- Create: `src/stages/extract.js`
- Create: `src/utils/scraper.js`

**Step 1: Create the scraper utility**

```javascript
// src/utils/scraper.js
// Extracts readable content from web pages. When we find a link
// in a newsletter email, we visit that page and pull out the
// main article text. This gives Claude much richer material to
// analyze than just the newsletter summary.

const cheerio = require('cheerio');

/**
 * Extract all links from an HTML email body.
 * Filters out common junk links (unsubscribe, tracking pixels, etc.)
 *
 * @param {string} html - the email's HTML body
 * @returns {string[]} array of URLs
 */
function extractLinksFromEmail(html) {
  if (!html) return [];

  const $ = cheerio.load(html);
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && isContentLink(href)) {
      links.push(href);
    }
  });

  // Remove duplicates
  return [...new Set(links)];
}

/**
 * Filter out links that aren't actual content (tracking, unsubscribe, etc.)
 */
function isContentLink(url) {
  const skipPatterns = [
    'unsubscribe', 'manage-preferences', 'email-preferences',
    'mailto:', 'tel:', '#', 'javascript:',
    'twitter.com/intent', 'facebook.com/sharer',
    'linkedin.com/sharing',
    // Common email tracking domains
    'list-manage.com', 'mailchimp.com/track',
    'substack.com/action', 'convertkit.com',
  ];

  const lower = url.toLowerCase();
  return skipPatterns.every((pattern) => !lower.includes(pattern));
}

/**
 * Fetch a web page and extract its main text content.
 * Uses common article selectors to find the main content area,
 * falling back to the full body text.
 *
 * @param {string} url - the page URL to fetch
 * @returns {object} { url, title, text, error }
 */
async function extractArticleContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        // Identify ourselves politely
        'User-Agent': 'DesignScout/1.0 (newsletter research tool)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { url, title: '', text: '', error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get the page title
    const title = $('title').text().trim()
      || $('h1').first().text().trim()
      || '';

    // Try to find the main article content using common selectors
    // (most content sites use one of these patterns)
    const contentSelectors = [
      'article', '[role="main"]', '.post-content', '.article-content',
      '.entry-content', '.post-body', '.story-body', 'main',
    ];

    let text = '';
    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        text = el.text().trim();
        break;
      }
    }

    // Fallback: just get the body text
    if (!text) {
      text = $('body').text().trim();
    }

    // Clean up whitespace (articles often have tons of extra spaces/newlines)
    text = text.replace(/\s+/g, ' ').trim();

    // Cap at ~5000 chars to avoid sending enormous pages to Claude
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '... [truncated]';
    }

    return { url, title, text, error: null };
  } catch (err) {
    return { url, title: '', text: '', error: err.message };
  }
}

module.exports = { extractLinksFromEmail, extractArticleContent, isContentLink };
```

**Step 2: Create the Extract stage**

```javascript
// src/stages/extract.js
// STAGE 2: EXTRACT
// Takes the raw emails from Stage 1, parses out the text content,
// extracts links, and visits each linked page to grab the full
// article text. This gives Claude much more to work with than
// just the newsletter email body.

const cheerio = require('cheerio');
const { extractLinksFromEmail, extractArticleContent } = require('../utils/scraper');
const { saveStageOutput, loadStageOutput } = require('../utils/data');

/**
 * @param {object} config - app config (not used directly here but kept for consistency)
 * @returns {object} extracted content from emails and linked articles
 */
async function extract(config) {
  // Load the output from Stage 1
  const collected = loadStageOutput('collect');
  if (!collected) {
    throw new Error('No collect stage output found. Run Stage 1 first.');
  }

  const results = [];

  for (const sourceGroup of collected.data.results) {
    const sourceResults = {
      source: sourceGroup.source,
      emails: [],
    };

    for (const email of sourceGroup.emails) {
      console.log(`Processing: "${email.subject}"`);

      // Parse the email HTML to get plain text summary
      const emailText = email.bodyText
        || (email.bodyHtml ? cheerio.load(email.bodyHtml).text().trim() : '');

      // Extract links from the email
      const links = extractLinksFromEmail(email.bodyHtml);
      console.log(`  Found ${links.length} content links`);

      // Visit each link and extract article content
      // Limit to 5 links per email to avoid hammering servers
      const maxLinks = Math.min(links.length, 5);
      const articles = [];

      for (let i = 0; i < maxLinks; i++) {
        console.log(`  Fetching: ${links[i].substring(0, 60)}...`);
        const article = await extractArticleContent(links[i]);

        if (article.error) {
          console.log(`    Error: ${article.error}`);
        } else {
          console.log(`    Got: "${article.title}" (${article.text.length} chars)`);
        }

        articles.push(article);

        // Be polite: small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      }

      sourceResults.emails.push({
        id: email.id,
        subject: email.subject,
        from: email.from,
        date: email.date,
        emailText: emailText.substring(0, 3000), // Cap email text too
        links,
        articles,
      });
    }

    results.push(sourceResults);
  }

  const output = {
    extractDate: new Date().toISOString(),
    totalEmails: results.reduce((sum, s) => sum + s.emails.length, 0),
    totalArticles: results.reduce(
      (sum, s) => sum + s.emails.reduce((eSum, e) => eSum + e.articles.length, 0),
      0
    ),
    results,
  };

  const filePath = saveStageOutput('extract', output);
  console.log(`Saved to: ${filePath}`);

  return output;
}

module.exports = extract;
```

**Step 3: Write a test for the scraper utility**

```javascript
// src/utils/scraper.test.js
const { extractLinksFromEmail, isContentLink } = require('./scraper');

test('extractLinksFromEmail pulls href values from HTML', () => {
  const html = `
    <a href="https://example.com/article">Read more</a>
    <a href="https://example.com/another">Another link</a>
  `;
  const links = extractLinksFromEmail(html);
  expect(links).toContain('https://example.com/article');
  expect(links).toContain('https://example.com/another');
});

test('extractLinksFromEmail filters out junk links', () => {
  const html = `
    <a href="https://example.com/article">Good link</a>
    <a href="https://list-manage.com/track/click">Tracking</a>
    <a href="https://example.com/unsubscribe">Unsub</a>
    <a href="mailto:test@test.com">Email</a>
  `;
  const links = extractLinksFromEmail(html);
  expect(links).toEqual(['https://example.com/article']);
});

test('extractLinksFromEmail deduplicates links', () => {
  const html = `
    <a href="https://example.com/article">Link 1</a>
    <a href="https://example.com/article">Link 2</a>
  `;
  const links = extractLinksFromEmail(html);
  expect(links).toHaveLength(1);
});

test('extractLinksFromEmail handles empty/null input', () => {
  expect(extractLinksFromEmail('')).toEqual([]);
  expect(extractLinksFromEmail(null)).toEqual([]);
});

test('isContentLink rejects social sharing links', () => {
  expect(isContentLink('https://twitter.com/intent/tweet')).toBe(false);
  expect(isContentLink('https://facebook.com/sharer/sharer.php')).toBe(false);
  expect(isContentLink('https://linkedin.com/sharing/share')).toBe(false);
});
```

**Step 4: Run tests**

```bash
npx jest src/utils/scraper.test.js --verbose
```

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/stages/extract.js src/utils/scraper.js src/utils/scraper.test.js
git commit -m "feat: add Stage 2 (Extract) - parse emails and follow links"
```

---

### Task 5: Museum/Archive API Clients

**Files:**
- Create: `src/utils/archives.js`
- Create: `src/utils/archives.test.js`

**Step 1: Create the archives utility**

```javascript
// src/utils/archives.js
// Clients for searching museum and archive APIs.
// Each function searches one source and returns results in a
// common format: { source, title, description, date, url, imageUrl }
//
// TIER 1 (no key needed): V&A, Rijksmuseum, Cooper Hewitt, Library of Congress, Internet Archive
// TIER 2 (free key): Europeana, Harvard Art Museums

/**
 * Search the V&A Museum collection.
 * Docs: https://developers.vam.ac.uk/
 * No API key required.
 */
async function searchVA(query, limit = 5) {
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=${limit}&images_exist=true`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.records || []).map((item) => ({
    source: 'V&A Museum',
    title: item._primaryTitle || item.objectType || 'Untitled',
    description: item._primaryMaker?.name
      ? `By ${item._primaryMaker.name}. ${item.objectType || ''}`
      : item.objectType || '',
    date: item._primaryDate || '',
    url: `https://collections.vam.ac.uk/item/${item.systemNumber}`,
    imageUrl: item._primaryImageId
      ? `https://framemark.vam.ac.uk/collections/${item._primaryImageId}/full/600,/0/default.jpg`
      : null,
  }));
}

/**
 * Search the Rijksmuseum collection.
 * Docs: https://data.rijksmuseum.nl/docs/
 * No API key required for search endpoint.
 */
async function searchRijksmuseum(query, limit = 5) {
  const url = `https://www.rijksmuseum.nl/api/en/collection?q=${encodeURIComponent(query)}&ps=${limit}&imgonly=True`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.artObjects || []).map((item) => ({
    source: 'Rijksmuseum',
    title: item.title || 'Untitled',
    description: item.longTitle || '',
    date: item.dating?.presentingDate || '',
    url: item.links?.web || `https://www.rijksmuseum.nl/en/collection/${item.objectNumber}`,
    imageUrl: item.webImage?.url || null,
  }));
}

/**
 * Search the Cooper Hewitt collection.
 * Docs: https://apidocs.cooperhewitt.org/
 * No API key required for basic searches.
 */
async function searchCooperHewitt(query, limit = 5) {
  const url = `https://api.collection.cooperhewitt.org/rest/?method=cooperhewitt.search.objects&query=${encodeURIComponent(query)}&page=1&per_page=${limit}&has_images=1`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.objects || []).map((item) => ({
    source: 'Cooper Hewitt',
    title: item.title || 'Untitled',
    description: item.description || item.type || '',
    date: item.date || '',
    url: item.url || '',
    imageUrl: item.images?.[0]?.b?.url || null,
  }));
}

/**
 * Search the Library of Congress digital collections.
 * Docs: https://www.loc.gov/apis/
 * No API key required.
 */
async function searchLibraryOfCongress(query, limit = 5) {
  const url = `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=${limit}&fa=online-format:image`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((item) => ({
    source: 'Library of Congress',
    title: item.title || 'Untitled',
    description: item.description?.[0] || '',
    date: item.date || '',
    url: item.url || item.id || '',
    imageUrl: item.image_url?.[0] || null,
  }));
}

/**
 * Search the Internet Archive.
 * Docs: https://archive.org/developers/
 * No API key required.
 */
async function searchInternetArchive(query, limit = 5) {
  const url = `https://archive.org/services/search/v1/scrape?q=${encodeURIComponent(query)}&count=${limit}&fields=title,description,date,identifier`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((item) => ({
    source: 'Internet Archive',
    title: item.title || 'Untitled',
    description: item.description || '',
    date: item.date || '',
    url: `https://archive.org/details/${item.identifier}`,
    imageUrl: `https://archive.org/services/img/${item.identifier}`,
  }));
}

/**
 * Search Europeana (requires free API key).
 * Docs: https://apis.europeana.eu/
 */
async function searchEuropeana(query, apiKey, limit = 5) {
  if (!apiKey) return [];
  const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(query)}&rows=${limit}&wskey=${apiKey}&media=true`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((item) => ({
    source: 'Europeana',
    title: item.title?.[0] || 'Untitled',
    description: item.dcDescription?.[0] || '',
    date: item.year?.[0] || '',
    url: item.guid || '',
    imageUrl: item.edmPreview?.[0] || null,
  }));
}

/**
 * Search Harvard Art Museums (requires free API key).
 * Docs: https://github.com/harvardartmuseums/api-docs
 */
async function searchHarvard(query, apiKey, limit = 5) {
  if (!apiKey) return [];
  const url = `https://api.harvardartmuseums.org/object?keyword=${encodeURIComponent(query)}&size=${limit}&hasimage=1&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.records || []).map((item) => ({
    source: 'Harvard Art Museums',
    title: item.title || 'Untitled',
    description: item.description || item.classification || '',
    date: item.dated || '',
    url: item.url || '',
    imageUrl: item.primaryimageurl || null,
  }));
}

/**
 * Search Wikipedia for design-related content.
 * Uses the Wikipedia API's search endpoint.
 */
async function searchWikipedia(query, limit = 5) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' design')}&srlimit=${limit}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.query?.search || []).map((item) => ({
    source: 'Wikipedia',
    title: item.title || 'Untitled',
    // Strip HTML tags from the snippet
    description: (item.snippet || '').replace(/<[^>]*>/g, ''),
    date: '',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    imageUrl: null,
  }));
}

/**
 * Search across all available archive sources for a given query.
 * Picks the top results from each source.
 *
 * @param {string} query - search term
 * @param {object} config - app config (for API keys)
 * @param {number} perSource - max results per source
 * @returns {Array} combined results from all sources
 */
async function searchAllArchives(query, config, perSource = 3) {
  console.log(`Searching archives for: "${query}"`);

  // Run all searches in parallel for speed
  const results = await Promise.allSettled([
    searchVA(query, perSource),
    searchRijksmuseum(query, perSource),
    searchCooperHewitt(query, perSource),
    searchLibraryOfCongress(query, perSource),
    searchInternetArchive(query, perSource),
    searchEuropeana(query, config.museums.europeanaKey, perSource),
    searchHarvard(query, config.museums.harvardKey, perSource),
    searchWikipedia(query, perSource),
  ]);

  // Collect successful results, skip failures
  const combined = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      combined.push(...result.value);
    }
  }

  console.log(`Found ${combined.length} archive results`);
  return combined;
}

module.exports = {
  searchVA, searchRijksmuseum, searchCooperHewitt,
  searchLibraryOfCongress, searchInternetArchive,
  searchEuropeana, searchHarvard, searchWikipedia,
  searchAllArchives,
};
```

**Step 2: Write basic tests**

```javascript
// src/utils/archives.test.js
// These tests check that the API client functions handle errors
// gracefully and return the expected format. We mock fetch to
// avoid hitting real APIs in tests.

const {
  searchVA, searchRijksmuseum, searchWikipedia,
} = require('./archives');

// Save original fetch
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('searchVA returns empty array on network error', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  // searchVA should catch the error internally
  // If it doesn't, this test will fail and we know to add error handling
  try {
    const results = await searchVA('chair');
    expect(results).toEqual([]);
  } catch {
    // If it throws, that's also acceptable — we'll handle in searchAllArchives
  }
});

test('searchWikipedia returns formatted results', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      query: {
        search: [
          { title: 'Bauhaus', snippet: 'A German <span>art school</span>' },
        ],
      },
    }),
  });

  const results = await searchWikipedia('bauhaus');
  expect(results).toHaveLength(1);
  expect(results[0].source).toBe('Wikipedia');
  expect(results[0].title).toBe('Bauhaus');
  expect(results[0].description).toBe('A German art school'); // HTML stripped
  expect(results[0].url).toContain('wikipedia.org');
});

test('searchRijksmuseum returns formatted results', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      artObjects: [
        {
          title: 'Night Watch',
          longTitle: 'The Night Watch by Rembrandt',
          objectNumber: 'SK-C-5',
          dating: { presentingDate: '1642' },
          links: { web: 'https://www.rijksmuseum.nl/en/collection/SK-C-5' },
          webImage: { url: 'https://example.com/image.jpg' },
        },
      ],
    }),
  });

  const results = await searchRijksmuseum('night watch');
  expect(results).toHaveLength(1);
  expect(results[0].source).toBe('Rijksmuseum');
  expect(results[0].date).toBe('1642');
});
```

**Step 3: Run tests**

```bash
npx jest src/utils/archives.test.js --verbose
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/archives.js src/utils/archives.test.js
git commit -m "feat: add museum/archive API clients for 8 sources"
```

---

### Task 6: Stage 3 - Analyze (Claude + archives)

**Files:**
- Create: `src/stages/analyze.js`
- Create: `src/prompts/analyze.js`

**Step 1: Create the analysis prompt**

```javascript
// src/prompts/analyze.js
// The prompt that tells Claude how to analyze newsletter content
// and find surprising Design Lobster-style connections.
// This is THE most important file in the project — the quality
// of the briefings depends almost entirely on this prompt.
// We'll iterate on it over time as we see real results.

/**
 * Build the analysis prompt from extracted newsletter content.
 *
 * @param {object} extractedData - output from Stage 2
 * @param {Array} archiveResults - results from museum/archive searches
 * @returns {string} the prompt to send to Claude
 */
function buildAnalysisPrompt(extractedData, archiveResults) {
  // Compile all the newsletter content into a readable summary
  const newsletterSummary = extractedData.results
    .map((sourceGroup) => {
      const sourceName = sourceGroup.source.name;
      return sourceGroup.emails.map((email) => {
        const articleSummaries = email.articles
          .filter((a) => a.text && !a.error)
          .map((a) => `  - "${a.title}": ${a.text.substring(0, 500)}`)
          .join('\n');

        return `FROM: ${sourceName}\nSUBJECT: ${email.subject}\nDATE: ${email.date}\nEMAIL CONTENT:\n${email.emailText?.substring(0, 1000) || '(no text)'}\nLINKED ARTICLES:\n${articleSummaries || '  (none)'}`;
      }).join('\n\n---\n\n');
    })
    .join('\n\n===\n\n');

  // Compile archive results
  const archiveSummary = archiveResults
    .map((item) => `[${item.source}] "${item.title}" (${item.date}) — ${item.description}\nURL: ${item.url}`)
    .join('\n\n');

  return `You are helping write Design Lobster, a biweekly newsletter by Ben Strak that tells "surprising stories from the world of design." It has 7,000+ subscribers who love unexpected angles on design.

Design Lobster's style:
- Curious, accessible tone — never academic or jargon-heavy
- Finds the surprising story behind everyday objects and design decisions
- Connects current design trends to unexpected historical precedents
- Covers forgotten designers, cross-cultural design comparisons, and origin stories
- Each issue usually has a main essay plus curated interesting links

## YOUR TASK

Analyze the following newsletter content and archive material. Produce a structured briefing with three sections:

### 1. IDEAS TO THINK ABOUT (3-4 ideas)
Look across all the newsletters for underlying themes, recurring topics, or contrarian angles. Each idea should be:
- A potential jumping-off point for a short essay
- Connected to a historical precedent or surprising origin story
- Framed as a question or provocative observation
- Include a suggested "draft angle" — one sentence describing how Ben could approach this as a Design Lobster piece

### 2. OBJECTS (2-3 objects)
From the archive results below, pick the most interesting objects that connect to themes in the newsletters. For each:
- Explain WHY this object is interesting in a Design Lobster context
- Connect it to something contemporary
- Include the source and URL

### 3. INTERESTING LINKS (3-5 links)
From the newsletter articles, pick the best/most interesting links. For each:
- Write a brief commentary on why it's worth reading
- Note which newsletter it came from
- Suggest a Design Lobster angle if there is one

## NEWSLETTER CONTENT

${newsletterSummary}

## ARCHIVE MATERIAL

${archiveSummary}

## IMPORTANT
- Be specific, not generic. "Design is everywhere" is not an insight.
- Prioritize surprising connections over obvious ones.
- Write in a warm, curious tone matching Design Lobster's voice.
- If a theme appears in multiple newsletters, that's a signal it's worth exploring.
- Always cite your sources with URLs.`;
}

module.exports = { buildAnalysisPrompt };
```

**Step 2: Create the Analyze stage**

```javascript
// src/stages/analyze.js
// STAGE 3: ANALYZE
// This is the brain of Design Scout. It takes extracted newsletter
// content, searches museum/archive APIs for related objects, then
// sends everything to Claude with a carefully crafted prompt to
// find surprising connections and generate briefing material.

const Anthropic = require('@anthropic-ai/sdk');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { searchAllArchives } = require('../utils/archives');
const { buildAnalysisPrompt } = require('../prompts/analyze');

/**
 * @param {object} config - app config
 * @returns {object} Claude's structured analysis
 */
async function analyze(config) {
  // Load extracted content from Stage 2
  const extracted = loadStageOutput('extract');
  if (!extracted) {
    throw new Error('No extract stage output found. Run Stage 2 first.');
  }

  // Step 1: Identify key themes/keywords from the extracted content
  // We'll ask Claude to do a quick pass to find search terms
  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Identifying themes for archive search...');
  const themeResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Given these newsletter subjects and content snippets, identify 3-5 specific search keywords that would find interesting historical design objects in museum archives. Return ONLY a JSON array of strings, nothing else.

Subjects: ${extracted.data.results
  .flatMap((s) => s.emails.map((e) => e.subject))
  .join(', ')}`,
    }],
  });

  // Parse the keywords from Claude's response
  let searchKeywords;
  try {
    searchKeywords = JSON.parse(themeResponse.content[0].text);
  } catch {
    // Fallback keywords if parsing fails
    searchKeywords = ['industrial design', 'typography', 'furniture design'];
  }
  console.log(`Search keywords: ${searchKeywords.join(', ')}`);

  // Step 2: Search archives with those keywords
  const allArchiveResults = [];
  for (const keyword of searchKeywords) {
    const results = await searchAllArchives(keyword, config, 2);
    allArchiveResults.push(...results);
  }
  console.log(`Total archive results: ${allArchiveResults.length}`);

  // Step 3: Send everything to Claude for the main analysis
  console.log('Running main analysis with Claude...');
  const prompt = buildAnalysisPrompt(extracted.data, allArchiveResults);

  const analysisResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = analysisResponse.content[0].text;

  const output = {
    analysisDate: new Date().toISOString(),
    searchKeywords,
    archiveResultCount: allArchiveResults.length,
    archiveResults: allArchiveResults,
    analysis,
  };

  const filePath = saveStageOutput('analyze', output);
  console.log(`Saved to: ${filePath}`);

  return output;
}

module.exports = analyze;
```

**Step 3: Commit**

```bash
git add src/stages/analyze.js src/prompts/analyze.js
git commit -m "feat: add Stage 3 (Analyze) - Claude analysis + archive search"
```

---

### Task 7: Stage 4 - Generate (structure the briefing)

**Files:**
- Create: `src/stages/generate.js`
- Create: `src/prompts/generate.js`

**Step 1: Create the generation prompt**

```javascript
// src/prompts/generate.js
// Prompt for the Generate stage. Takes Claude's analysis from
// Stage 3 and asks it to produce a final structured briefing
// in the exact format we want for email and Notion delivery.

/**
 * Build the generation prompt.
 * @param {string} analysis - the raw analysis text from Stage 3
 * @returns {string} prompt for Claude
 */
function buildGenerationPrompt(analysis) {
  return `You are formatting a Design Lobster newsletter briefing. Take the analysis below and produce a structured JSON output with exactly this format:

{
  "themes": ["tag1", "tag2", ...],
  "ideas": [
    {
      "title": "Short catchy title",
      "summary": "2-3 sentences explaining the idea and why it's interesting",
      "historicalConnection": "The surprising historical link",
      "draftAngle": "One sentence: how to approach this as a Design Lobster piece",
      "sources": ["url1", "url2"]
    }
  ],
  "objects": [
    {
      "title": "Object name",
      "source": "Museum name",
      "date": "When it's from",
      "description": "Why this object is interesting in a Design Lobster context",
      "contemporaryConnection": "How it connects to something modern",
      "url": "Link to the museum record",
      "imageUrl": "Image link if available"
    }
  ],
  "links": [
    {
      "title": "Article title",
      "url": "Article URL",
      "newsletter": "Which newsletter it came from",
      "commentary": "2-3 sentences on why it's worth reading and a Design Lobster angle"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanation
- 3-4 ideas, 2-3 objects, 3-5 links
- Keep the tone warm, curious, and specific
- Every item should feel like it could spark a Design Lobster issue

## ANALYSIS TO FORMAT

${analysis}`;
}

module.exports = { buildGenerationPrompt };
```

**Step 2: Create the Generate stage**

```javascript
// src/stages/generate.js
// STAGE 4: GENERATE
// Takes the raw analysis from Stage 3 and structures it into
// a clean JSON briefing that Stage 5 can render into both
// a Notion page and an email.

const Anthropic = require('@anthropic-ai/sdk');
const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { buildGenerationPrompt } = require('../prompts/generate');

/**
 * @param {object} config - app config
 * @returns {object} structured briefing data
 */
async function generate(config) {
  const analyzed = loadStageOutput('analyze');
  if (!analyzed) {
    throw new Error('No analyze stage output found. Run Stage 3 first.');
  }

  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

  console.log('Generating structured briefing...');
  const prompt = buildGenerationPrompt(analyzed.data.analysis);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse the JSON response
  let briefing;
  try {
    const text = response.content[0].text;
    // Handle case where Claude wraps JSON in markdown code fences
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    briefing = JSON.parse(jsonText);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    // Save the raw text so we can debug
    briefing = { raw: response.content[0].text, parseError: err.message };
  }

  const output = {
    generateDate: new Date().toISOString(),
    briefing,
    stats: {
      ideasCount: briefing.ideas?.length || 0,
      objectsCount: briefing.objects?.length || 0,
      linksCount: briefing.links?.length || 0,
    },
  };

  const filePath = saveStageOutput('generate', output);
  console.log(`Saved to: ${filePath}`);
  console.log(`Stats: ${output.stats.ideasCount} ideas, ${output.stats.objectsCount} objects, ${output.stats.linksCount} links`);

  return output;
}

module.exports = generate;
```

**Step 3: Commit**

```bash
git add src/stages/generate.js src/prompts/generate.js
git commit -m "feat: add Stage 4 (Generate) - structure briefing as JSON"
```

---

### Task 8: Stage 5 - Deliver (Notion page + email)

**Files:**
- Create: `src/stages/deliver.js`
- Create: `src/utils/briefing-email.js`
- Create: `src/utils/briefing-notion.js`

**Step 1: Create the Notion delivery utility**

```javascript
// src/utils/briefing-notion.js
// Creates a briefing page in the Notion Briefings Database.
// The page contains the full structured briefing with all three
// sections: Ideas, Objects, and Interesting Links.

const { Client } = require('@notionhq/client');

/**
 * Create a briefing page in Notion.
 *
 * @param {object} config - app config
 * @param {object} briefing - structured briefing from Stage 4
 * @returns {string} URL of the created Notion page
 */
async function createBriefingPage(config, briefing) {
  const notion = new Client({ auth: config.notion.apiKey });

  const today = new Date().toISOString().split('T')[0];
  const title = `Briefing - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  // Build the page content as Notion blocks
  const children = [];

  // === IDEAS TO THINK ABOUT ===
  children.push(heading2('Ideas to Think About'));

  for (const idea of (briefing.ideas || [])) {
    children.push(heading3(idea.title));
    children.push(paragraph(idea.summary));
    children.push(paragraph(`Historical connection: ${idea.historicalConnection}`));
    children.push(callout(`Draft angle: ${idea.draftAngle}`));

    if (idea.sources?.length) {
      children.push(paragraph(`Sources: ${idea.sources.join(', ')}`));
    }

    children.push(divider());
  }

  // === OBJECTS ===
  children.push(heading2('Objects'));

  for (const obj of (briefing.objects || [])) {
    children.push(heading3(`${obj.title} (${obj.source}, ${obj.date})`));
    children.push(paragraph(obj.description));
    children.push(paragraph(`Contemporary connection: ${obj.contemporaryConnection}`));

    if (obj.url) {
      children.push(bookmark(obj.url));
    }

    children.push(divider());
  }

  // === INTERESTING LINKS ===
  children.push(heading2('Interesting Links'));

  for (const link of (briefing.links || [])) {
    children.push(heading3(link.title));
    children.push(paragraph(`via ${link.newsletter}`));
    children.push(paragraph(link.commentary));

    if (link.url) {
      children.push(bookmark(link.url));
    }

    children.push(divider());
  }

  // Create the page
  const page = await notion.pages.create({
    parent: { database_id: config.notion.briefingsDbId },
    properties: {
      'Title': { title: [{ text: { content: title } }] },
      'Date': { date: { start: today } },
      'Status': { select: { name: 'New' } },
      'Theme Tags': {
        multi_select: (briefing.themes || []).map((t) => ({ name: t })),
      },
    },
    children,
  });

  return page.url;
}

// --- Notion block helper functions ---
// These create the block objects that Notion's API expects.
// Each one returns a single block in Notion's format.

function heading2(text) {
  return {
    object: 'block', type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function heading3(text) {
  return {
    object: 'block', type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function paragraph(text) {
  return {
    object: 'block', type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: text } }] },
  };
}

function callout(text) {
  return {
    object: 'block', type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: text } }],
      icon: { type: 'emoji', emoji: '💡' },
    },
  };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function bookmark(url) {
  return {
    object: 'block', type: 'bookmark',
    bookmark: { url },
  };
}

module.exports = { createBriefingPage };
```

**Step 2: Create the email delivery utility**

```javascript
// src/utils/briefing-email.js
// Formats the briefing as an email and sends it via Gmail SMTP.
// The email is a concise summary — the full detail lives in Notion.

const nodemailer = require('nodemailer');

/**
 * Build the briefing email HTML from structured briefing data.
 *
 * @param {object} briefing - structured briefing from Stage 4
 * @param {string} notionUrl - URL to the full Notion briefing page
 * @param {object} stats - pipeline stats (newsletters scanned, etc.)
 * @returns {string} HTML email content
 */
function buildEmailHtml(briefing, notionUrl, stats) {
  const ideasHtml = (briefing.ideas || []).map((idea) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <strong style="font-size: 16px;">${idea.title}</strong><br>
      <span style="color: #444; line-height: 1.6;">${idea.summary}</span><br>
      <span style="color: #666; font-style: italic;">Historical connection: ${idea.historicalConnection}</span><br>
      <span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">
        Draft angle: ${idea.draftAngle}
      </span>
    </td></tr>
  `).join('');

  const objectsHtml = (briefing.objects || []).map((obj) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <strong style="font-size: 16px;">${obj.title}</strong>
      <span style="color: #888;"> — ${obj.source}, ${obj.date}</span><br>
      <span style="color: #444; line-height: 1.6;">${obj.description}</span><br>
      <span style="color: #666;">Contemporary connection: ${obj.contemporaryConnection}</span><br>
      ${obj.url ? `<a href="${obj.url}" style="color: #c44;">View in collection →</a>` : ''}
    </td></tr>
  `).join('');

  const linksHtml = (briefing.links || []).map((link) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <a href="${link.url}" style="color: #c44; font-size: 16px; font-weight: bold; text-decoration: none;">
        ${link.title}
      </a>
      <span style="color: #888;"> via ${link.newsletter}</span><br>
      <span style="color: #444; line-height: 1.6;">${link.commentary}</span>
    </td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #222;">
  <h1 style="font-size: 24px; border-bottom: 3px solid #c44; padding-bottom: 12px;">
    Design Scout Briefing
  </h1>

  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Ideas to Think About</h2>
  <table style="width: 100%; border-collapse: collapse;">${ideasHtml}</table>

  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Objects</h2>
  <table style="width: 100%; border-collapse: collapse;">${objectsHtml}</table>

  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Interesting Links</h2>
  <table style="width: 100%; border-collapse: collapse;">${linksHtml}</table>

  <div style="margin-top: 32px; padding: 16px; background: #f8f8f8; border-radius: 8px; font-size: 14px; color: #666;">
    ${stats.newslettersScanned || 0} newsletters scanned · ${stats.archivesSearched || 0} archives searched<br>
    <a href="${notionUrl}" style="color: #c44; font-weight: bold;">Full briefing + draft paragraphs → Notion</a>
  </div>

  <p style="font-size: 12px; color: #999; margin-top: 24px;">— Design Scout</p>
</body>
</html>`;
}

/**
 * Send the briefing email via Gmail SMTP.
 *
 * @param {object} config - app config
 * @param {string} html - the email HTML
 */
async function sendBriefingEmail(config, html) {
  // Create a transporter using Gmail OAuth2
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: config.gmail.userEmail,
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      refreshToken: config.gmail.refreshToken,
    },
  });

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });

  await transporter.sendMail({
    from: `Design Scout <${config.gmail.userEmail}>`,
    to: config.briefing.recipientEmail,
    subject: `Design Scout Briefing — ${today}`,
    html,
  });

  console.log(`Briefing email sent to ${config.briefing.recipientEmail}`);
}

module.exports = { buildEmailHtml, sendBriefingEmail };
```

**Step 3: Create the Deliver stage**

```javascript
// src/stages/deliver.js
// STAGE 5: DELIVER
// Takes the structured briefing from Stage 4 and delivers it
// in two formats:
// 1. A full Notion page in the Briefings Database
// 2. A summary email with the highlights

const { loadStageOutput, saveStageOutput } = require('../utils/data');
const { createBriefingPage } = require('../utils/briefing-notion');
const { buildEmailHtml, sendBriefingEmail } = require('../utils/briefing-email');

/**
 * @param {object} config - app config
 */
async function deliver(config) {
  const generated = loadStageOutput('generate');
  if (!generated) {
    throw new Error('No generate stage output found. Run Stage 4 first.');
  }

  const briefing = generated.data.briefing;

  // 1. Create Notion page
  console.log('Creating Notion briefing page...');
  const notionUrl = await createBriefingPage(config, briefing);
  console.log(`Notion page created: ${notionUrl}`);

  // 2. Send email
  console.log('Sending briefing email...');
  const stats = {
    newslettersScanned: generated.data.stats?.ideasCount || 0,
    archivesSearched: 8, // Number of archive sources we search
  };
  const emailHtml = buildEmailHtml(briefing, notionUrl, stats);
  await sendBriefingEmail(config, emailHtml);

  // 3. Save delivery record
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
```

**Step 4: Commit**

```bash
git add src/stages/deliver.js src/utils/briefing-email.js src/utils/briefing-notion.js
git commit -m "feat: add Stage 5 (Deliver) - Notion page + email"
```

---

### Task 9: Wire Up the Pipeline

**Files:**
- Modify: `src/index.js`

**Step 1: Uncomment and wire up all stages**

```javascript
// src/index.js
// Main entry point. Runs all 5 pipeline stages in order.
// Each stage saves its output to JSON, so if one fails you can
// re-run from where it broke without repeating earlier stages.

const config = require('./config');

async function runPipeline() {
  console.log('=== Design Scout Pipeline ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Stage 1: Collect emails from newsletter sources
    console.log('--- Stage 1: Collect ---');
    const collect = require('./stages/collect');
    const collected = await collect(config);
    console.log(`Collected ${collected.totalEmails} emails from ${collected.sourcesScanned} sources\n`);

    // Stage 2: Extract content from emails and linked articles
    console.log('--- Stage 2: Extract ---');
    const extract = require('./stages/extract');
    const extracted = await extract(config);
    console.log(`Extracted content from ${extracted.totalEmails} emails, ${extracted.totalArticles} articles\n`);

    // Stage 3: Analyze content with Claude + museum APIs
    console.log('--- Stage 3: Analyze ---');
    const analyze = require('./stages/analyze');
    const analyzed = await analyze(config);
    console.log(`Analysis complete. ${analyzed.archiveResultCount} archive results found\n`);

    // Stage 4: Generate structured briefing
    console.log('--- Stage 4: Generate ---');
    const generate = require('./stages/generate');
    const generated = await generate(config);
    console.log(`Briefing generated: ${generated.stats.ideasCount} ideas, ${generated.stats.objectsCount} objects, ${generated.stats.linksCount} links\n`);

    // Stage 5: Deliver to Notion + email
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
```

**Step 2: Add npm scripts to package.json**

Add these to the `"scripts"` section:

```json
{
  "start": "node src/index.js",
  "test": "jest",
  "stage:collect": "node -e \"require('./src/stages/collect')(require('./src/config'))\"",
  "stage:extract": "node -e \"require('./src/stages/extract')(require('./src/config'))\"",
  "stage:analyze": "node -e \"require('./src/stages/analyze')(require('./src/config'))\"",
  "stage:generate": "node -e \"require('./src/stages/generate')(require('./src/config'))\"",
  "stage:deliver": "node -e \"require('./src/stages/deliver')(require('./src/config'))\""
}
```

**Step 3: Commit**

```bash
git add src/index.js package.json
git commit -m "feat: wire up full pipeline with individual stage scripts"
```

---

### Task 10: Gmail OAuth2 Setup Guide

**Files:**
- Create: `docs/setup-gmail.md`

**Step 1: Write the setup guide**

A step-by-step guide for setting up Gmail OAuth2 credentials in Google Cloud Console. This is the most complex setup step and needs to be done once manually. The guide should cover:

1. Create a Google Cloud project
2. Enable the Gmail API
3. Create OAuth2 credentials (Desktop app type)
4. Run a one-time auth script to get a refresh token
5. Save credentials to `.env`

**Step 2: Create a one-time OAuth helper script**

```javascript
// scripts/gmail-auth.js
// ONE-TIME SETUP SCRIPT
// Run this once to get your Gmail refresh token.
// It opens a browser window where you sign in to Google,
// then prints the refresh token to paste into your .env file.

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env first');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000/callback'
);

// Generate the URL to visit
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
  prompt: 'consent',
});

console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in and authorize the app');
console.log('3. You will be redirected — the token will appear here\n');

// Start a temporary server to catch the callback
const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  if (query.code) {
    const { tokens } = await oauth2Client.getToken(query.code);
    console.log('=== SUCCESS ===');
    console.log(`\nAdd this to your .env file:\n`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    res.end('Done! You can close this tab.');
    server.close();
  }
});

server.listen(3000);
```

**Step 3: Commit**

```bash
git add docs/setup-gmail.md scripts/gmail-auth.js
git commit -m "docs: add Gmail OAuth2 setup guide and auth helper script"
```

---

### Task 11: Notion Setup Guide + Database Creation

**Files:**
- Create: `docs/setup-notion.md`
- Create: `scripts/setup-notion.js`

**Step 1: Write the Notion setup guide**

A step-by-step guide covering:
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Get the API key
3. Run the setup script to create both databases
4. Save database IDs to `.env`

**Step 2: Create a setup script that creates both Notion databases**

```javascript
// scripts/setup-notion.js
// ONE-TIME SETUP SCRIPT
// Creates the Sources and Briefings databases in Notion.
// Run this once, then paste the database IDs into your .env file.

const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_API_KEY || !PARENT_PAGE_ID) {
  console.error('Set NOTION_API_KEY and NOTION_PARENT_PAGE_ID in your .env first');
  console.error('NOTION_PARENT_PAGE_ID = the page where you want the databases created');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function setup() {
  // Create Sources Database
  console.log('Creating Sources database...');
  const sourcesDb = await notion.databases.create({
    parent: { page_id: PARENT_PAGE_ID },
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

  // Create Briefings Database
  console.log('Creating Briefings database...');
  const briefingsDb = await notion.databases.create({
    parent: { page_id: PARENT_PAGE_ID },
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
```

**Step 3: Commit**

```bash
git add docs/setup-notion.md scripts/setup-notion.js
git commit -m "docs: add Notion setup guide and database creation script"
```

---

### Task 12: Railway.app Deployment

**Files:**
- Create: `Procfile`
- Create: `railway.json`
- Create: `docs/setup-railway.md`

**Step 1: Create Railway config**

```json
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "cronSchedule": "0 8 */3 * *"
  }
}
```

The cron expression `0 8 */3 * *` means: run at 8:00 AM every 3 days.

**Step 2: Create deployment guide**

A step-by-step guide for deploying to Railway covering:
1. Create Railway account
2. Connect GitHub repo
3. Set environment variables
4. Verify cron schedule

**Step 3: Commit**

```bash
git add Procfile railway.json docs/setup-railway.md
git commit -m "feat: add Railway deployment config and guide"
```

---

### Task 13: End-to-End Test with Real Data

**Step 1: Set up `.env` with real credentials**

Follow the guides in `docs/setup-gmail.md` and `docs/setup-notion.md`.

**Step 2: Add a few test sources to the Notion Sources Database**

Add 2-3 newsletters you actually subscribe to.

**Step 3: Run each stage individually to verify**

```bash
npm run stage:collect
npm run stage:extract
npm run stage:analyze
npm run stage:generate
npm run stage:deliver
```

Check each stage's JSON output in the `data/` directory between runs.

**Step 4: Run the full pipeline**

```bash
npm start
```

**Step 5: Review the Notion page and email, iterate on prompts**

The prompts in `src/prompts/analyze.js` and `src/prompts/generate.js` will need tuning based on real results. This is expected — we'll iterate.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete end-to-end verification"
```
