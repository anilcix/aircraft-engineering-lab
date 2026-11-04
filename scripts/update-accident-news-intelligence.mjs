import fs from 'node:fs/promises'

const SOURCES = [
  { name: 'FlightGlobal', domain: 'flightglobal.com' },
  { name: 'Aviation Week', domain: 'aviationweek.com' },
  { name: 'The Aviation Herald', domain: 'avherald.com' },
  { name: 'AeroTime', domain: 'aerotime.aero' },
  { name: 'Simple Flying', domain: 'simpleflying.com' },
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
    rows.push({
      title: cleanTitle(rawTitle, source),
      url: tag(block, 'link'),
      source,
      publishedAt: dateIso(tag(block, 'pubDate')),
    })
  }
  return rows
}

function queryFor(item) {
  const core = [item.title, item.operator, item.aircraft || item.family, item.date?.slice(0, 4)]
    .filter(Boolean)
    .join(' ')
    .slice(0, 160)
  const sites = SOURCES.map((source) => 'site:' + source.domain).join(' OR ')
  return '"' + core + '" (' + sites + ')'
}

const raw = JSON.parse(await fs.readFile('public/aviation-accidents.json', 'utf8'))
const items = Array.isArray(raw.items) ? raw.items : []
const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365 * 2

const targets = items
  .filter((item) => item.sourceTier !== 'discovery' || (Date.parse(item.date || '') || 0) >= cutoff)
  .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
  .slice(0, 120)

const cases = {}

for (const item of targets) {
  const query = queryFor(item)
  try {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en'
    const xml = await fetchText(url)
    const seen = new Set()
    const articles = parseRss(xml).filter((article) => {
      if (!article.url || seen.has(article.url)) return false
      seen.add(article.url)
      return true
    }).slice(0, 15)
    cases[item.id] = { query, articles }
  } catch (error) {
    cases[item.id] = { query, articles: [] }
    console.warn('Accident news skipped for ' + item.id + ': ' + error.message)
  }
  await new Promise((resolve) => setTimeout(resolve, 120))
}

const payload = { updatedAt: new Date().toISOString(), sourceSet: SOURCES, cases }
await fs.writeFile('public/accident-news-intelligence.json', JSON.stringify(payload, null, 2) + '\n')
console.log('accident-news-intelligence.json updated for ' + Object.keys(cases).length + ' cases')
