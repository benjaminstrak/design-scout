// src/utils/archives.js
// Clients for searching museum and archive APIs.
// TIER 1 (no key needed): V&A, Rijksmuseum, Cooper Hewitt, Library of Congress,
//                         Internet Archive, MET Museum, Art Institute of Chicago
// TIER 2 (free key): Europeana, Harvard Art Museums

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function searchVA(query, limit = 5) {
  const offset = randomInt(0, 40);
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=${limit}&offset=${offset}&images_exist=true`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records || []).map((item) => ({
    source: 'V&A Museum',
    title: item._primaryTitle || item.objectType || 'Untitled',
    description: item._primaryMaker?.name ? `By ${item._primaryMaker.name}. ${item.objectType || ''}` : item.objectType || '',
    date: item._primaryDate || '',
    url: `https://collections.vam.ac.uk/item/${item.systemNumber}`,
    imageUrl: item._primaryImageId ? `https://framemark.vam.ac.uk/collections/${item._primaryImageId}/full/600,/0/default.jpg` : null,
  }));
}

async function searchRijksmuseum(query, limit = 5) {
  const page = randomInt(1, 8);
  const url = `https://www.rijksmuseum.nl/api/en/collection?q=${encodeURIComponent(query)}&ps=${limit}&p=${page}&imgonly=True`;
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

async function searchCooperHewitt(query, limit = 5) {
  const page = randomInt(1, 8);
  const url = `https://api.collection.cooperhewitt.org/rest/?method=cooperhewitt.search.objects&query=${encodeURIComponent(query)}&page=${page}&per_page=${limit}&has_images=1`;
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

async function searchLibraryOfCongress(query, limit = 5) {
  const page = randomInt(1, 6);
  const url = `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=${limit}&sp=${page}&fa=online-format:image`;
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

async function searchInternetArchive(query, limit = 5) {
  const url = `https://archive.org/services/search/v1/scrape?q=${encodeURIComponent(query)}&count=${limit}&fields=title,description,date,identifier&sorts=random`;
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

async function searchMet(query, limit = 5) {
  // Step 1: search for object IDs
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const allIds = searchData.objectIDs || [];
  if (allIds.length === 0) return [];

  // Step 2: pick random IDs and fetch details
  const shuffled = shuffleArray(allIds);
  const selected = shuffled.slice(0, limit * 3); // fetch extra in case some fail
  const detailPromises = selected.slice(0, limit).map(async (id) => {
    try {
      const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
      if (!res.ok) return null;
      const item = await res.json();
      if (!item.primaryImageSmall) return null;
      return {
        source: 'The Metropolitan Museum of Art',
        title: item.title || 'Untitled',
        description: [item.artistDisplayName, item.classification, item.medium].filter(Boolean).join(' · '),
        date: item.objectDate || '',
        url: item.objectURL || '',
        imageUrl: item.primaryImageSmall || null,
      };
    } catch {
      return null;
    }
  });
  const details = await Promise.all(detailPromises);
  return details.filter(Boolean).slice(0, limit);
}

async function searchArtIC(query, limit = 5) {
  const page = randomInt(1, 6);
  const fields = 'id,title,date_display,description,artist_display,image_id';
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}&fields=${fields}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((item) => ({
    source: 'Art Institute of Chicago',
    title: item.title || 'Untitled',
    description: [item.artist_display, item.description].filter(Boolean).join(' — ').substring(0, 300),
    date: item.date_display || '',
    url: `https://www.artic.edu/artworks/${item.id}`,
    imageUrl: item.image_id ? `https://www.artic.edu/iiif/2/${item.image_id}/full/600,/0/default.jpg` : null,
  }));
}

async function searchEuropeana(query, apiKey, limit = 5) {
  if (!apiKey) return [];
  const start = randomInt(1, 50);
  const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(query)}&rows=${limit}&start=${start}&wskey=${apiKey}&media=true`;
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

async function searchHarvard(query, apiKey, limit = 5) {
  if (!apiKey) return [];
  const page = randomInt(1, 6);
  const url = `https://api.harvardartmuseums.org/object?keyword=${encodeURIComponent(query)}&size=${limit}&page=${page}&hasimage=1&apikey=${apiKey}`;
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

async function searchWikipedia(query, limit = 5) {
  // `generator=search` instead of `list=search` so we can pull the article
  // thumbnail and intro text in the same call — a plain search only returns a
  // snippet and no image, and Wikipedia is too common a source to leave
  // pictureless when the briefing is meant to show the object.
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} design`,
    gsrlimit: String(limit),
    prop: 'pageimages|extracts',
    piprop: 'thumbnail',
    pithumbsize: '600',
    exintro: '1',
    explaintext: '1',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  // Generator results come back keyed by page id, not in relevance order;
  // `index` carries the original search ranking.
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map((item) => {
    const title = item.title || 'Untitled';
    const description = (item.extract || '').replace(/<[^>]*>/g, '').trim();
    return {
      source: 'Wikipedia',
      title,
      description: description.length > 600 ? `${description.slice(0, 600)}…` : description,
      date: '',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      imageUrl: item.thumbnail?.source || null,
    };
  });
}

async function searchAllArchives(query, config, perSource = 3) {
  console.log(`Searching archives for: "${query}"`);
  const results = await Promise.allSettled([
    searchVA(query, perSource),
    searchRijksmuseum(query, perSource),
    searchCooperHewitt(query, perSource),
    searchLibraryOfCongress(query, perSource),
    searchInternetArchive(query, perSource),
    searchMet(query, perSource),
    searchArtIC(query, perSource),
    searchEuropeana(query, config.museums?.europeanaKey, perSource),
    searchHarvard(query, config.museums?.harvardKey, perSource),
    searchWikipedia(query, perSource),
  ]);
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
  searchMet, searchArtIC,
  searchEuropeana, searchHarvard, searchWikipedia,
  searchAllArchives,
};
