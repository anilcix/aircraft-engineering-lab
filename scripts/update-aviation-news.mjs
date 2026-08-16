import fs from 'node:fs/promises'

const sources = [
  { source: 'Aviation Week', url: 'https://aviationweek.com/awn-rss/feed' },
  { source: 'NASA Aeronautics', url: 'https://www.nasa.gov/aeronautics/' },
  { source: 'FlightGlobal', url: 'https://www.flightglobal.com/' },
  { source: 'Aerospace Manufacturing & Design', url: 'https://www.aerospacemanufacturinganddesign.com/section/latest-news/' },
]

const technicalWords = [
  'aircraft', 'aerospace', 'aviation', 'airframe', 'aerostructure', 'wing', 'fuselage', 'structure',
  'composite', 'thermoplastic', 'material', 'alloy', 'superalloy', 'additive', 'manufacturing', 'machining',
  'forging', 'automation', 'robot', 'engine', 'turbine', 'propulsion', 'hydrogen', 'electric', 'hybrid',
  'supersonic', 'hypersonic', 'mro', 'maintenance', 'repair', 'coating', 'fatigue', 'certification',
  'evtol', 'uam', 'drone', 'rotor', 'sustainable', 'saf', 'recycling', 'upcycling', 'technology', 'concept',
]

function decodeHtml(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function categoryFor(title) {
  const t = title.toLowerCase()
  if (/composite|thermoplastic|material|alloy|superalloy|ceramic|titanium|aluminium|aluminum/.test(t)) return 'Materials'
  if (/manufactur|additive|3d print|machin|forg|factory|automation|robot|production|industrial/.test(t)) return 'Manufacturing'
  if (/engine|turbine|propulsion|hydrogen|electric|hybrid|fan|compressor|combustor/.test(t)) return 'Propulsion'
  if (/mro|maintenance|repair|overhaul|inspection/.test(t)) return 'MRO'
  if (/wing|fuselage|airframe|aerostruct|structure|fatigue|load|buckling/.test(t)) return 'Structures'
  if (/sustain|recycl|upcycl|emission|saf|net zero/.test(t)) return 'Sustainability'
  if (/concept|future|next-generation|next generation|supersonic|hypersonic|evtol|uam|x-plane|demonstrator/.test(t)) return 'New Concepts'
  return 'Industry'
}

function isTechnical(title) {
  const t = title.toLowerCase()
  return title.length >= 24 && title.length <= 190 && technicalWords.some((word) => t.includes(word))
}

function resolveUrl(href, base) {
  try { return new URL(href, base).toString() } catch { return base }
}

function extractLinks(html, source) {
  const out = []
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = re.exec(html))) {
    const title = decodeHtml(match[2])
    if (!isTechnical(title)) continue
    const url = resolveUrl(match[1], source.url)
    if (!/^https?:/.test(url)) continue
    out.push({
      title,
      source: source.source,
      category: categoryFor(title),
      url,
      summary: `Latest technical aerospace item collected from ${source.source}.`,
    })
  }
  return out
}

async function readPrevious() {
  try {
    return JSON.parse(await fs.readFile('public/aviation-news.json', 'utf8'))
  } catch {
    return { updatedAt: new Date(0).toISOString(), items: [] }
  }
}

const previous = await readPrevious()
const collected = []

for (const source of sources) {
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'AircraftEngineeringLab/1.0 (+GitHub Pages technical news index)' },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`${response.status}`)
    const html = await response.text()
    collected.push(...extractLinks(html, source))
  } catch (error) {
    console.warn(`Source skipped: ${source.source}: ${error.message}`)
  }
}

const seen = new Set()
const fresh = collected.filter((item) => {
  const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!key || seen.has(key)) return false
  seen.add(key)
  return true
}).slice(0, 60)

const merged = fresh.length >= 6 ? fresh : [...fresh, ...(previous.items || [])].filter((item) => {
  const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (seen.has(`previous:${key}`)) return false
  seen.add(`previous:${key}`)
  return true
}).slice(0, 60)

const payload = { updatedAt: new Date().toISOString(), items: merged }
await fs.writeFile('public/aviation-news.json', `${JSON.stringify(payload, null, 2)}\n`)
console.log(`aviation-news.json updated with ${merged.length} items`)
