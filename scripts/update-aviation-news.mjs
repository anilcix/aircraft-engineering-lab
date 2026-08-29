import fs from 'node:fs/promises'

const sources = [
  { source: 'Aviation Week', url: 'https://aviationweek.com/awn-rss/feed', kind: 'rss' },
  { source: 'NASA Aeronautics', url: 'https://www.nasa.gov/aeronautics/', kind: 'html' },
  { source: 'FlightGlobal', url: 'https://www.flightglobal.com/news/aerospace', kind: 'html' },
  { source: 'Aerospace Manufacturing & Design', url: 'https://www.aerospacemanufacturinganddesign.com/section/latest-news/', kind: 'html' },
]

const technicalWords = [
  'aircraft', 'aerospace', 'aviation', 'airframe', 'aerostructure', 'wing', 'fuselage', 'structure',
  'composite', 'thermoplastic', 'material', 'alloy', 'superalloy', 'additive', 'manufacturing', 'machining',
  'forging', 'automation', 'robot', 'engine', 'turbine', 'propulsion', 'hydrogen', 'electric', 'hybrid',
  'supersonic', 'hypersonic', 'mro', 'maintenance', 'repair', 'coating', 'fatigue', 'certification',
  'evtol', 'uam', 'drone', 'rotor', 'sustainable', 'saf', 'recycling', 'upcycling', 'technology', 'concept',
]

function decodeHtml(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, '’')
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

function summaryTrFor(source, category) {
  const areas = {
    Materials: 'havacılık malzemeleri ve malzeme teknolojileri',
    Manufacturing: 'havacılık üretimi, imalat teknolojileri ve tedarik zinciri',
    Propulsion: 'motor, türbin ve itki sistemleri',
    MRO: 'bakım, onarım ve revizyon faaliyetleri',
    Structures: 'uçak yapıları, yük taşıyan bileşenler ve yapısal teknoloji',
    Sustainability: 'sürdürülebilir havacılık ve emisyon azaltımı',
    'New Concepts': 'yeni nesil havacılık konseptleri ve teknoloji geliştirme',
    Industry: 'havacılık sektörü, programlar ve araştırma faaliyetleri',
  }
  return `${source} kaynaklı bu gelişme, ${areas[category] || 'havacılık teknolojileri'} alanındaki yeni bir güncellemeyi ele alıyor.`
}

function isTechnical(title) {
  const t = title.toLowerCase()
  return title.length >= 24 && title.length <= 190 && technicalWords.some((word) => t.includes(word))
}

function resolveUrl(href, base) {
  try { return new URL(href, base).toString() } catch { return base }
}

function isoDate(value) {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeHtml(match[1]) : ''
}

function extractRss(xml, source) {
  const items = []
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
  for (const block of blocks.slice(0, 20)) {
    const title = tagValue(block, 'title')
    if (!isTechnical(title)) continue
    const link = tagValue(block, 'link') || block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || ''
    const publishedAt = isoDate(tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated') || tagValue(block, 'dc:date'))
    const description = tagValue(block, 'description')
    const category = categoryFor(title)
    items.push({
      title,
      source: source.source,
      category,
      publishedAt,
      url: resolveUrl(link, source.url),
      summary: description ? decodeHtml(description).slice(0, 260) : `Latest technical aerospace item collected from ${source.source}.`,
      summaryTr: summaryTrFor(source.source, category),
    })
  }
  return items
}

function extractHtmlLinks(html, source) {
  const out = []
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = re.exec(html))) {
    const title = decodeHtml(match[2])
    if (!isTechnical(title)) continue
    const url = resolveUrl(match[1], source.url)
    if (!/^https?:/.test(url)) continue
    const category = categoryFor(title)
    out.push({
      title,
      source: source.source,
      category,
      url,
      summary: `Latest technical aerospace item collected from ${source.source}.`,
      summaryTr: summaryTrFor(source.source, category),
    })
    if (out.length >= 14) break
  }
  return out
}

function extractPublishedAt(html) {
  const patterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
    /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    const parsed = isoDate(match?.[1])
    if (parsed) return parsed
  }
  return undefined
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'AircraftEngineeringLab/1.0 (+GitHub Pages technical news index)' },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`${response.status}`)
  return response.text()
}

async function hydrateDates(items) {
  const result = []
  for (const item of items.slice(0, 40)) {
    if (item.publishedAt) { result.push(item); continue }
    try {
      const html = await fetchText(item.url)
      result.push({ ...item, publishedAt: extractPublishedAt(html) })
    } catch {
      result.push(item)
    }
  }
  return result
}

async function readPrevious() {
  try { return JSON.parse(await fs.readFile('public/aviation-news.json', 'utf8')) }
  catch { return { updatedAt: new Date(0).toISOString(), items: [] } }
}

const previous = await readPrevious()
const collected = []

for (const source of sources) {
  try {
    const body = await fetchText(source.url)
    const items = source.kind === 'rss' ? extractRss(body, source) : extractHtmlLinks(body, source)
    collected.push(...items)
  } catch (error) {
    console.warn(`Source skipped: ${source.source}: ${error.message}`)
  }
}

const seen = new Set()
const deduped = collected.filter((item) => {
  const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!key || seen.has(key)) return false
  seen.add(key)
  return true
})

const hydrated = await hydrateDates(deduped)
const currentKeys = new Set(hydrated.map((x) => x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
const previousExtras = (previous.items || [])
  .filter((item) => !currentKeys.has(item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
  .map((item) => ({ ...item, summaryTr: item.summaryTr || summaryTrFor(item.source, item.category) }))

const merged = [...hydrated, ...previousExtras]
  .sort((a, b) => {
    const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bt - at
  })
  .slice(0, 60)

const payload = { updatedAt: new Date().toISOString(), items: merged }
await fs.writeFile('public/aviation-news.json', `${JSON.stringify(payload, null, 2)}\n`)
console.log(`aviation-news.json updated with ${merged.length} items; ${merged.filter((x) => x.publishedAt).length} include publication dates`)
