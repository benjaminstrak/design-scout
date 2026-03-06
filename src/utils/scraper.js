// src/utils/scraper.js
const cheerio = require('cheerio');

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
  return [...new Set(links)];
}

function isContentLink(url) {
  const skipPatterns = [
    'unsubscribe', 'manage-preferences', 'email-preferences',
    'mailto:', 'tel:', '#', 'javascript:',
    'twitter.com/intent', 'facebook.com/sharer',
    'linkedin.com/sharing',
    'list-manage.com', 'mailchimp.com/track',
    'substack.com/action', 'convertkit.com',
  ];
  const lower = url.toLowerCase();
  return skipPatterns.every((pattern) => !lower.includes(pattern));
}

async function extractArticleContent(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DesignScout/1.0 (newsletter research tool)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { url, title: '', text: '', error: `HTTP ${response.status}` };
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    const contentSelectors = [
      'article', '[role="main"]', '.post-content', '.article-content',
      '.entry-content', '.post-body', '.story-body', 'main',
    ];
    let text = '';
    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length > 0) { text = el.text().trim(); break; }
    }
    if (!text) text = $('body').text().trim();
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 5000) text = text.substring(0, 5000) + '... [truncated]';
    return { url, title, text, error: null };
  } catch (err) {
    return { url, title: '', text: '', error: err.message };
  }
}

module.exports = { extractLinksFromEmail, extractArticleContent, isContentLink };
