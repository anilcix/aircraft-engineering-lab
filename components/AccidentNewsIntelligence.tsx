'use client'

import { useEffect, useMemo, useState } from 'react'

type Article = { title: string; url: string; source: string; publishedAt?: string; summary?: string }
type IntelPayload = { updatedAt: string; sourceSet: { name: string; domain: string }[]; cases: Record<string, { query: string; articles: Article[] }> }

type AccidentRow = {
  id: string
  title: string
  date: string
  operator?: string
  aircraft?: string
  family?: string
  location?: string
  summary?: string
  probableCause?: string
  status?: string
  sourceTier?: string
  fatalities?: number
  authority?: string
  sourceUrl?: string
  reportUrl?: string
}

type Props = {
  accident: AccidentRow
  allAccidents?: AccidentRow[]
}

const EMPTY: IntelPayload = { updatedAt: '', sourceSet: [], cases: {} }

const SOURCES = [
  { name: 'FlightGlobal', domain: 'flightglobal.com' },
  { name: 'Aviation Week', domain: 'aviationweek.com' },
  { name: 'The Aviation Herald', domain: 'avherald.com' },
  { name: 'Aviation Safety Network', domain: 'aviation-safety.net' },
  { name: 'Reuters', domain: 'reuters.com' },
]

const FACTORS = [
  { key: 'weather', label: 'Hava / icing / türbülans', words: ['icing','ice ','turbulence','wind shear','windshear','storm','weather','convective','microburst','fog','visibility'] },
  { key: 'propulsion', label: 'Motor / yakıt / itki', words: ['engine','thrust','fuel','power loss','flameout','fan blade','compressor','propulsion'] },
  { key: 'structure', label: 'Yapısal / uçuş kumandası', words: ['structural','structure','elevator','rudder','aileron','flight control','control jam','pylon','separation','fatigue','fracture','crack'] },
  { key: 'approach', label: 'Yaklaşma / enerji / uçuş yolu', words: ['unstable approach','approach','landing','go-around','go around','airspeed','energy state','stall','overshoot','runway overrun'] },
  { key: 'systems', label: 'Elektrik / hidrolik / sistem', words: ['electrical','hydraulic','avionics','sensor','autopilot','system failure','warning','flight computer'] },
  { key: 'maintenance', label: 'Bakım / inspeksiyon', words: ['maintenance','inspection','overhaul','repair','missed inspection','service bulletin'] },
  { key: 'atc', label: 'ATC / havaalanı operasyonu', words: ['atc','controller','clearance','runway incursion','phraseology','airport lighting','wrong runway'] },
  { key: 'external', label: 'Harici etken / FOD / kuş', words: ['bird strike','bird','fod','foreign object','debris','drone'] },
]

function searchUrl(accident: AccidentRow, domain: string) {
  const terms = [accident.title, accident.operator, accident.aircraft, accident.date?.slice(0, 4)].filter(Boolean).join(' ')
  return 'https://www.google.com/search?q=' + encodeURIComponent('site:' + domain + ' ' + terms)
}

function supportLabel(score: number) {
  if (score >= 5) return { label: 'Yüksek destek', cls: 'high' }
  if (score >= 2) return { label: 'Orta destek', cls: 'medium' }
  return { label: 'Düşük destek', cls: 'low' }
}


const SIMILARITY_WORDS = [
  'takeoff','departure','climb','cruise','descent','approach','landing','go-around','runway',
  'stall','airspeed','overspeed','icing','turbulence','wind shear','engine','fuel','fire',
  'smoke','hydraulic','electrical','autopilot','flight control','structural','bird strike',
  'maintenance','atc','visibility','weather','gear','brake','pressurization'
]

const PHASES = [
  { key: 'takeoff', words: ['takeoff','departure','rotation','liftoff','initial climb'] },
  { key: 'climb', words: ['climb','climbing'] },
  { key: 'cruise', words: ['cruise','en route','enroute'] },
  { key: 'descent', words: ['descent','descending'] },
  { key: 'approach', words: ['approach','final approach','go-around','go around'] },
  { key: 'landing', words: ['landing','touchdown','runway overrun','hard landing'] },
]

function phaseFor(item: AccidentRow) {
  const text = normalizedText(item)
  return PHASES.find((phase) => phase.words.some((word) => text.includes(word)))?.key
}

function factorKeys(item: AccidentRow) {
  const text = normalizedText(item)
  return FACTORS.filter((factor) => factor.words.some((word) => text.includes(word))).map((factor) => factor.key)
}

function normalizedText(item: AccidentRow) {
  return [item.title, item.summary, item.probableCause, item.location, item.aircraft, item.family]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function similarityScore(selected: AccidentRow, candidate: AccidentRow) {
  if (selected.id === candidate.id) return -1
  const a = normalizedText(selected)
  const b = normalizedText(candidate)
  let score = 0

  const selectedPhase = phaseFor(selected)
  const candidatePhase = phaseFor(candidate)
  if (selectedPhase && candidatePhase && selectedPhase === candidatePhase) score += 4

  const selectedFactors = new Set(factorKeys(selected))
  const candidateFactors = new Set(factorKeys(candidate))
  for (const key of selectedFactors) if (candidateFactors.has(key)) score += 3

  for (const word of SIMILARITY_WORDS) {
    if (a.includes(word) && b.includes(word)) score += 1
  }

  if (selected.family && candidate.family && selected.family === candidate.family) score += 4
  if (selected.aircraft && candidate.aircraft && selected.aircraft === candidate.aircraft) score += 3
  if (selected.operator && candidate.operator && selected.operator === candidate.operator) score += 1

  const selectedFatal = (selected.fatalities || 0) > 0
  const candidateFatal = (candidate.fatalities || 0) > 0
  if (selectedFatal === candidateFatal) score += 1

  return score
}

function causeText(item: AccidentRow) {
  if (item.probableCause?.trim()) return item.probableCause.trim()
  if (item.summary?.trim()) return item.summary.trim()
  return 'Sebep / bulgu henüz indekslenmemiş.'
}

function AccidentHistoryTable({ rows, emptyText }: { rows: AccidentRow[]; emptyText: string }) {
  if (!rows.length) return <div className="accident-intel-empty">{emptyText}</div>

  return <div className="accident-history-table-wrap">
    <table className="accident-history-table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Uçak</th>
          <th>Operatör</th>
          <th>Yer</th>
          <th>Ölüm</th>
          <th>Sebep / bulgu</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <tr key={row.id}>
          <td>{row.date}</td>
          <td>{row.aircraft || row.family || '—'}</td>
          <td>{row.operator || '—'}</td>
          <td>{row.location || '—'}</td>
          <td>{typeof row.fatalities === 'number' ? row.fatalities : '—'}</td>
          <td>
            <span>{causeText(row)}</span>
            {(row.reportUrl || row.sourceUrl) && <a href={row.reportUrl || row.sourceUrl} target="_blank" rel="noreferrer">Kaynak ↗</a>}
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

export default function AccidentNewsIntelligence({ accident, allAccidents = [] }: Props) {
  const [data, setData] = useState<IntelPayload>(EMPTY)

  useEffect(() => {
    fetch('./accident-news-intelligence.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((payload: IntelPayload) => setData(payload))
      .catch(() => undefined)
  }, [])

  const cached = data.cases[accident.id]
  const articles = cached?.articles || []

  const similarAccidents = useMemo(() => {
    const ranked = allAccidents
      .map((item) => ({ item, score: similarityScore(accident, item) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score || (Date.parse(b.item.date || '') || 0) - (Date.parse(a.item.date || '') || 0))

    const strong = ranked.filter((row) => row.score >= 3)
    const chosen = strong.length >= 3 ? strong : ranked.filter((row) => row.score > 0)
    return chosen.slice(0, 10).map((row) => row.item)
  }, [accident, allAccidents])

  const sameAircraftHistory = useMemo(() => {
    const family = accident.family || accident.aircraft
    if (!family) return []
    return allAccidents
      .filter((item) => item.id !== accident.id && (item.family === family || item.aircraft === family || item.aircraft === accident.aircraft))
      .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
      .slice(0, 20)
  }, [accident, allAccidents])

  const hypotheses = useMemo(() => {
    const base = [accident.title, accident.summary, accident.probableCause, accident.location, ...articles.map((x) => x.title)].filter(Boolean).join(' ').toLowerCase()
    return FACTORS.map((factor) => {
      let score = 0
      const evidence: string[] = []
      for (const word of factor.words) if (base.includes(word)) score += 1
      for (const article of articles) {
        const text = article.title.toLowerCase()
        const hits = factor.words.filter((word) => text.includes(word))
        if (hits.length) {
          score += Math.min(2, hits.length)
          evidence.push(article.source + ': ' + article.title)
        }
      }
      return { ...factor, score, evidence: evidence.slice(0, 3), support: supportLabel(score) }
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
  }, [accident, articles])

  return (
    <section className="accident-intel">
      <div className="dashboard-section-title">
        <span>5 kaynaklı olay istihbaratı</span>
        <small>{data.updatedAt ? 'Son tarama: ' + new Date(data.updatedAt).toLocaleString('tr-TR') : 'Kaynak indeksi yükleniyor'}</small>
      </div>

      <div className="accident-intel-warning">
        <strong>ERKEN AŞAMA ANALİZİ</strong>
        <p>Bu bölüm resmî probable cause değildir. Haberlerde bildirilen olguları ve olay kartındaki mevcut veriyi bir araya getirir; soruşturma ilerledikçe hipotezler değişebilir.</p>
      </div>

      <div className="accident-source-grid">
        {SOURCES.map((source) => {
          const sourceArticles = articles.filter((x) => x.source === source.name)
          return <details className="accident-source-card" key={source.domain} open={sourceArticles.length > 0}>
            <summary>
              <strong>{source.name}</strong>
              <span>{sourceArticles.length ? sourceArticles.length + ' haber bulundu' : 'Eşleşme yok'}</span>
            </summary>
            <div className="accident-source-card-body">
              {sourceArticles.length > 0 ? sourceArticles.slice(0, 3).map((article) => <article key={article.url}>
                <div className="source-article-meta">
                  <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('tr-TR') : 'Tarih yok'}</span>
                </div>
                <h5>{article.title}</h5>
                <p>{article.summary || 'Bu haber için kısa özet alınamadı; başlık ve kaynak bağlantısı mevcut.'}</p>
                <a href={article.url} target="_blank" rel="noreferrer">Haberi aç ↗</a>
              </article>) : <p className="source-empty">Bu kaynakta otomatik eşleşen haber bulunamadı.</p>}
              <a className="source-search-link" href={searchUrl(accident, source.domain)} target="_blank" rel="noreferrer">Bu olayı kaynakta ara ↗</a>
            </div>
          </details>
        })}
      </div>

      {articles.length > 0 && <div className="accident-intel-articles">
        <h4>Kaynaklarda bulunan haberler</h4>
        {articles.slice(0, 10).map((article) => <a href={article.url} target="_blank" rel="noreferrer" key={article.url}>
          <span>{article.source}</span><strong>{article.title}</strong><small>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('tr-TR') : ''}</small>
        </a>)}
      </div>}

      <div className="accident-history-section">
        <div className="dashboard-section-title">
          <span>Bu kazaya benzeyen geçmiş kazalar</span>
          <small>Olay belirtileri / flight phase / faktör benzerliği</small>
        </div>
        <AccidentHistoryTable rows={similarAccidents} emptyText="Benzerlik eşiğini geçen geçmiş vaka bulunamadı." />
      </div>

      <div className="accident-history-section">
        <div className="dashboard-section-title">
          <span>{(accident.family || accident.aircraft) ? (accident.family || accident.aircraft) + ' geçmiş kazaları' : 'Aynı uçak tipi geçmiş kazaları'}</span>
          <small>Aynı aircraft family / type</small>
        </div>
        <AccidentHistoryTable rows={sameAircraftHistory} emptyText="Bu uçak tipi/ailesi için indekslenmiş başka geçmiş vaka bulunamadı." />
      </div>

      <div className="accident-hypotheses">
        <div className="dashboard-section-title"><span>Rapor öncesi olası katkı faktörleri</span><small>Yüzde değil · kanıt desteği</small></div>
        {hypotheses.length ? hypotheses.map((factor) => <div className="hypothesis-card" key={factor.key}>
          <div className="hypothesis-head"><strong>{factor.label}</strong><span className={'support-' + factor.support.cls}>{factor.support.label}</span></div>
          {factor.evidence.length > 0 ? factor.evidence.map((item) => <p key={item}>• {item}</p>) : <p>Olay başlığı/özeti içinde bu faktörle ilişkili ifade bulundu; bağımsız haber teyidi henüz sınırlı.</p>}
        </div>) : <div className="accident-intel-empty">Mevcut açık kaynak verisi anlamlı bir hipotezi desteklemek için yetersiz. Bu durumda sistem sebep tahmini üretmez.</div>}
      </div>
    </section>
  )
}
