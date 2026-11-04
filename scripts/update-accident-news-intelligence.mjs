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


const STOP_TOKENS = new Set(['the','and','for','with','from','near','crash','accident','county','flight','aircraft','aviation','fatal','officials','says','say','after','before','into','over','under','about','this','that','2026','2025','2024'])

function normWords(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((x) => x.length >= 3 && !STOP_TOKENS.has(x))
}

function aircraftHint(item) {
  const text = [item.aircraft, item.family, item.title, item.summary].filter(Boolean).join(' ')
  const patterns = [
    /\bLearjet\s*\d{2}\b/i,
    /\bBoeing\s*7\d{2}(?:[- ]?[A-Z0-9]+)?\b/i,
    /\bAirbus\s*A\d{3}(?:[- ]?\d{3})?\b/i,
    /\bATR\s*\d{2}(?:[- ]?\d{3})?\b/i,
    /\bCRJ[- ]?\d{3,4}(?:LR)?\b/i,
    /\bEmbraer\s*\d{3}(?:AR)?\b/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[0]) return m[0]
  }
  return String(item.aircraft || item.family || '').trim()
}

function relevanceScore(item, article) {
  const targetText = [item.title, item.operator, item.aircraft, item.family, item.location].filter(Boolean).join(' ')
  const articleText = [article.title, article.summary].filter(Boolean).join(' ')
  const targetWords = new Set(normWords(targetText))
  const articleWords = new Set(normWords(articleText))
  let score = 0
  for (const w of targetWords) if (articleWords.has(w)) score += 1

  const hint = aircraftHint(item).toLowerCase()
  if (hint && articleText.toLowerCase().includes(hint)) score += 4

  const locationWords = normWords(item.location || '')
  if (locationWords.some((w) => articleWords.has(w))) score += 2

  const titleWords = normWords(item.title || '')
  const strongTitleOverlap = titleWords.filter((w) => articleWords.has(w)).length
  if (strongTitleOverlap >= 2) score += 2

  const eventDate = Date.parse(item.date || '')
  const articleDate = Date.parse(article.publishedAt || '')
  if (eventDate && articleDate) {
    const diffDays = Math.abs(articleDate - eventDate) / 86400000
    if (diffDays <= 14) score += 2
    else if (diffDays > 180) score -= 3
  }
  return score
}

function isRelevantArticle(item, article) {
  return relevanceScore(item, article) >= 4
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
  const hint = aircraftHint(item)
  const locationToken = String(item.location || title).split(/[,-]/)[0].trim()
  const ageQuery = hint ? ['site:' + source.domain, '"' + hint + '"', '"year-old"', locationToken].filter(Boolean).join(' ') : ''
  return [
    'site:' + source.domain + ' ' + broad,
    'site:' + source.domain + ' ' + fallback,
    ageQuery,
  ].filter(Boolean)
}

const raw = JSON.parse(await fs.readFile('public/aviation-accidents.json', 'utf8'))
const items = Array.isArray(raw.items) ? raw.items : []
const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365 * 2

const officialTargets = items.filter((item) => item.sourceTier !== 'discovery')
const recentDiscoveryTargets = items
  .filter((item) => item.sourceTier === 'discovery')
  .filter((item) => (Date.parse(item.date || '') || 0) >= cutoff)
  .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
  .slice(0, 80)

const targets = [...officialTargets, ...recentDiscoveryTargets]
  .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
  .slice(0, 180)

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
          if (!isRelevantArticle(item, article)) continue
          seen.add(article.url)
          articles.push({ ...article, relevanceScore: relevanceScore(item, article) })
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
