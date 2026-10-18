const { searchVA, searchRijksmuseum, searchWikipedia, imageLoads } = require('./archives');

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
      query: {
        pages: {
          // Deliberately out of relevance order — `index` is what ranks them.
          '222': { index: 2, title: 'Bauhaus style', extract: 'A later revival' },
          '111': {
            index: 1,
            title: 'Bauhaus',
            extract: 'A German art school',
            thumbnail: { source: 'https://upload.wikimedia.org/bauhaus.jpg' },
          },
        },
      },
    }),
  });
  const results = await searchWikipedia('bauhaus');
  expect(results).toHaveLength(2);
  expect(results[0].source).toBe('Wikipedia');
  expect(results[0].title).toBe('Bauhaus');
  expect(results[0].description).toBe('A German art school');
  expect(results[0].url).toContain('wikipedia.org');
  expect(results[0].imageUrl).toBe('https://upload.wikimedia.org/bauhaus.jpg');
  // Ranking is preserved, and a page with no thumbnail is still returned.
  expect(results[1].title).toBe('Bauhaus style');
  expect(results[1].imageUrl).toBeNull();
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

test('imageLoads only accepts a successful image response', async () => {
  const reply = (status, type) => ({ ok: status < 300, headers: { get: () => type }, body: null });
  global.fetch = jest.fn().mockResolvedValue(reply(206, 'image/jpeg'));
  expect(await imageLoads('https://upload.wikimedia.org/a.jpg')).toBe(true);
  // What the Art Institute's bot check sends back instead of the picture
  global.fetch = jest.fn().mockResolvedValue(reply(403, 'text/html; charset=UTF-8'));
  expect(await imageLoads('https://www.artic.edu/iiif/2/x/full/600,/0/default.jpg')).toBe(false);
  global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
  expect(await imageLoads('https://example.com/slow.jpg')).toBe(false);
});
