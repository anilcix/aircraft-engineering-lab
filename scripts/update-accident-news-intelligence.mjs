import fs from 'node:fs/promises'

const SOURCES = [
  { name: 'FlightGlobal', domain: 'flightglobal.com' },
  { name: 'Aviation Week', domain: 'aviationweek.com' },
  { name: 'The Aviation Herald', domain: 'avherald.com' },
  { name: 'Aviation Safety Network', domain: 'aviation-safety.net' },
  { name: 'Reuters', domain: 'reuters.com' },
]

function decode(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block, name) {
  const open = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'))
  return open ? decode(open[1]) : ''
}

function dateIso(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function sourceFromTitle(title) {
  const lower = title.toLowerCase()
  return SOURCES.find((source) => lower.includes(source.name.toLowerCase()))?.name
}

function cleanTitle(rawTitle, source) {
  const suffix = ' - ' + source
  return rawTitle.endsWith(suffix) ? rawTitle.slice(0, -suffix.length).trim() : rawTitle
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'AircraftEngineeringLab/1.0 accident intelligence index' },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(String(response.status))
  return response.text()
}

function parseRss(xml) {
  const rows = []
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
  for (const block of blocks) {
    const rawTitle = tag(block, 'title')
    const source = sourceFromTitle(rawTitle)
    if (!source) continue
    const description = tag(block, 'description')
    const summary = description
      .replace(/^.+?\s-\s/, '')
      .replace(/Read more.*$/i, '')
      .trim()
      .slice(0, 420)

    rows.push({
      title: cleanTitle(rawTitle, source),
      url: tag(block, 'link'),
      source,
      publishedAt: dateIso(tag(block, 'pubDate')),
      summary,
    })
  }
  return rows
}

function searchTerms(item) {
  const title = String(item.title || '').replace(/[—–]/g, ' ').replace(/\s+/g, ' ').trim()
  const operator = String(item.operator || '').trim()
  const aircraft = String(item.aircraft || item.family || '').trim()
  const year = String(item.date || '').slice(0, 4)
  return { title, operator, aircraft, year }
}

function queriesFor(item, source) {
  const { title, operator, aircraft, year } = searchTerms(item)
  const broad = [title, operator, year].filter(Boolean).join(' ')
  const fallback = [operator, aircraft, year, title.split(' ').slice(-3).join(' ')].filter(Boolean).join(' ')
  return [
    'site:' + source.domain + ' ' + broad,
    'site:' + source.domain + ' ' + fallback,
  ]
}

const raw = JSON.parse(await fs.readFile('public/aviation-accidents.json', 'utf8'))
const items = Array.isArray(raw.items) ? raw.items : []
const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365 * 2

const targets = items
  .filter((item) => !String(item.id || '').startsWith('WIKIDATA-'))
  .filter((item) => item.sourceTier !== 'discovery' || (Date.parse(item.date || '') || 0) >= cutoff)
  .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
  .slice(0, 120)

const cases = {}

for (const item of targets) {
  const articles = []
  const seen = new Set()
  const queries = []

  for (const source of SOURCES) {
    let sourceFound = 0
    for (const query of queriesFor(item, source)) {
      queries.push(query)
      try {
        const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en'
        const xml = await fetchText(url)
        for (const article of parseRss(xml)) {
          if (article.source !== source.name || !article.url || seen.has(article.url)) continue
          seen.add(article.url)
          articles.push(article)
          sourceFound += 1
          if (sourceFound >= 3) break
        }
      } catch (error) {
        console.warn('Source search skipped for ' + item.id + ' / ' + source.name + ': ' + error.message)
      }
      if (sourceFound > 0) break
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  cases[item.id] = { query: queries.join(' || '), articles: articles.slice(0, 15) }
}

const payload = { updatedAt: new Date().toISOString(), sourceSet: SOURCES, cases }
await fs.writeFile('public/accident-news-intelligence.json', JSON.stringify(payload, null, 2) + '\n')
console.log('accident-news-intelligence.json updated for ' + Object.keys(cases).length + ' cases')
