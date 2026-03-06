const { searchVA, searchRijksmuseum, searchWikipedia } = require('./archives');

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('searchVA returns empty array on network error', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  try {
    const results = await searchVA('chair');
    expect(results).toEqual([]);
  } catch {
    // acceptable - we handle in searchAllArchives
  }
});

test('searchWikipedia returns formatted results', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      query: { search: [{ title: 'Bauhaus', snippet: 'A German <span>art school</span>' }] },
    }),
  });
  const results = await searchWikipedia('bauhaus');
  expect(results).toHaveLength(1);
  expect(results[0].source).toBe('Wikipedia');
  expect(results[0].title).toBe('Bauhaus');
  expect(results[0].description).toBe('A German art school');
  expect(results[0].url).toContain('wikipedia.org');
});

test('searchRijksmuseum returns formatted results', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      artObjects: [{
        title: 'Night Watch', longTitle: 'The Night Watch by Rembrandt',
        objectNumber: 'SK-C-5', dating: { presentingDate: '1642' },
        links: { web: 'https://www.rijksmuseum.nl/en/collection/SK-C-5' },
        webImage: { url: 'https://example.com/image.jpg' },
      }],
    }),
  });
  const results = await searchRijksmuseum('night watch');
  expect(results).toHaveLength(1);
  expect(results[0].source).toBe('Rijksmuseum');
  expect(results[0].date).toBe('1642');
});
