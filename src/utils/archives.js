// src/utils/archives.js
// Clients for searching museum and archive APIs.
// TIER 1 (no key needed): V&A, Rijksmuseum, Cooper Hewitt, Library of Congress, Internet Archive
// TIER 2 (free key): Europeana, Harvard Art Museums

async function searchVA(query, limit = 5) {
  const url = `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&page_size=${limit}&images_exist=true`;
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

async function searchWikipedia(query, limit = 5) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' design')}&srlimit=${limit}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query?.search || []).map((item) => ({
    source: 'Wikipedia',
    title: item.title || 'Untitled',
    description: (item.snippet || '').replace(/<[^>]*>/g, ''),
    date: '',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    imageUrl: null,
  }));
}

async function searchAllArchives(query, config, perSource = 3) {
  console.log(`Searching archives for: "${query}"`);
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
