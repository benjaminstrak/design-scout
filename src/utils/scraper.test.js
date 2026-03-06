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
