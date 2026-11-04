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
  aircraftAgeYears?: number
  manufacturer?: string
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
  { key: 'weather', label: 'Buzlanma / kötü hava / türbülans', words: ['icing','ice ','clear ice','turbulence','wind shear','windshear','storm','thunderstorm','weather','convective','precipitation','microburst','fog','visibility'] },
  { key: 'airdata', label: 'Sürat / air-data / sensör anomalisi', words: ['airspeed','air speed','pitot','air data','speed indication','erroneous speed','unreliable speed','sensor'] },
  { key: 'losscontrol', label: 'Kontrol kaybı / anormal dalış / stall', words: ['loss of control','loc-i','stall','overspeed','rapid descent','steep descent','uncontrolled descent','descending 10,000','descending 20,000','vertical dive'] },
  { key: 'highaltitude', label: 'Yüksek irtifa operasyonu', words: ['35,000','35000','fl350','37,000','37000','fl370','high altitude','cruise altitude'] },
  { key: 'propulsion', label: 'Motor / yakıt / itki', words: ['engine','thrust','fuel','power loss','flameout','fan blade','compressor','propulsion'] },
  { key: 'structure', label: 'Yapısal / uçuş kumandası', words: ['structural','structure','elevator','rudder','aileron','flight control','control jam','pylon','separation','fatigue','fracture','crack','breakup'] },
  { key: 'approach', label: 'Yaklaşma / iniş / enerji yönetimi', words: ['unstable approach','approach','landing','go-around','go around','energy state','overshoot','runway overrun'] },
  { key: 'systems', label: 'Elektrik / hidrolik / avionik sistem', words: ['electrical','hydraulic','avionics','autopilot','system failure','warning','flight computer'] },
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

function phaseForText(text: string) {
  return PHASES.find((phase) => phase.words.some((word) => text.includes(word)))?.key
}

function phaseFor(item: AccidentRow) {
  return phaseForText(normalizedText(item))
}

function factorKeysFromText(text: string) {
  return FACTORS.filter((factor) => factor.words.some((word) => text.includes(word))).map((factor) => factor.key)
}

function factorKeys(item: AccidentRow) {
  return factorKeysFromText(normalizedText(item))
}

function normalizedText(item: AccidentRow) {
  return [item.title, item.summary, item.probableCause, item.location, item.aircraft, item.family]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function similarityDetails(selected: AccidentRow, candidate: AccidentRow, selectedEvidenceText = '') {
  if (selected.id === candidate.id) return { score: -1, reasons: [] as string[] }
  const a = [normalizedText(selected), selectedEvidenceText].filter(Boolean).join(' ').toLowerCase()
  const b = normalizedText(candidate)
  let score = 0
  const reasons: string[] = []

  const selectedPhase = phaseForText(a)
  const candidatePhase = phaseFor(candidate)
  if (selectedPhase && candidatePhase && selectedPhase === candidatePhase) {
    score += 4
    const phaseLabel: Record<string, string> = { takeoff:'Kalkış safhası', climb:'Tırmanış safhası', cruise:'Seyir safhası', descent:'Alçalma safhası', approach:'Yaklaşma safhası', landing:'İniş safhası' }
    reasons.push(phaseLabel[selectedPhase] || 'Aynı uçuş safhası')
  }

  const selectedFactors = new Set(factorKeysFromText(a))
  const candidateFactors = new Set(factorKeys(candidate))
  for (const factor of FACTORS) {
    if (selectedFactors.has(factor.key) && candidateFactors.has(factor.key)) {
      score += ['weather','airdata','losscontrol'].includes(factor.key) ? 5 : 3
      reasons.push(factor.label)
    }
  }

  for (const word of SIMILARITY_WORDS) {
    if (a.includes(word) && b.includes(word)) score += 1
  }

  if (selected.family && candidate.family && selected.family === candidate.family) {
    score += 4
    reasons.push('Aynı uçak ailesi')
  }
  if (selected.aircraft && candidate.aircraft && selected.aircraft === candidate.aircraft) {
    score += 3
    reasons.push('Aynı uçak tipi')
  }

  const selectedFatal = (selected.fatalities || 0) > 0
  const candidateFatal = (candidate.fatalities || 0) > 0
  if (selectedFatal === candidateFatal) score += 1

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 4) }
}

function causeText(item: AccidentRow) {
  if (item.sourceTier === 'discovery') return 'Discovery kaydı — sebep için resmî soruşturma kaynağıyla doğrulama gerekli.'
  if (item.probableCause?.trim()) return item.probableCause.trim()
  if (item.summary?.trim()) return item.summary.trim()
  return 'Sebep / bulgu henüz indekslenmemiş.'
}

function AccidentHistoryTable({ rows, emptyText, reasonsById = {} }: { rows: AccidentRow[]; emptyText: string; reasonsById?: Record<string, string[]> }) {
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
          <th>Neden benziyor?</th>
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
          <td className="similarity-reason-cell">
            {(reasonsById[row.id] || []).length ? (reasonsById[row.id] || []).map((reason) => <span key={reason}>{reason}</span>) : <span>Genel olay profili benzerliği</span>}
          </td>
          <td>
            <span>{causeText(row)}</span>
            {(row.reportUrl || row.sourceUrl) && <a href={row.reportUrl || row.sourceUrl} target="_blank" rel="noreferrer">Kaynak ↗</a>}
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}


function AircraftTypeHistoryTable({ rows, emptyText }: { rows: AccidentRow[]; emptyText: string }) {
  if (!rows.length) return <div className="accident-intel-empty">{emptyText}</div>

  return <div className="accident-history-table-wrap">
    <table className="accident-history-table aircraft-type-history-table">
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Uçak tipi</th>
          <th>Yaş</th>
          <th>Operatör</th>
          <th>Yer</th>
          <th>Ölüm</th>
          <th>Kaza sebebi / resmî bulgu</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <tr key={row.id}>
          <td>{row.date}</td>
          <td>{row.aircraft || row.family || '—'}</td>
          <td>{typeof row.aircraftAgeYears === 'number' ? row.aircraftAgeYears.toFixed(1) + ' yıl' : 'Bilinmiyor'}</td>
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

  const selectedEvidenceText = useMemo(() => {
    return articles.map((article) => [article.title, article.summary].filter(Boolean).join(' ')).join(' ').toLowerCase()
  }, [articles])

  const similarAccidentRanking = useMemo(() => {
    return allAccidents
      .map((item) => ({ item, ...similarityDetails(accident, item, selectedEvidenceText) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || (Date.parse(b.item.date || '') || 0) - (Date.parse(a.item.date || '') || 0))
      .slice(0, 10)
  }, [accident, allAccidents, selectedEvidenceText])

  const similarAccidents = useMemo(() => similarAccidentRanking.map((row) => row.item), [similarAccidentRanking])
  const similarityReasons = useMemo(() => Object.fromEntries(similarAccidentRanking.map((row) => [row.item.id, row.reasons])), [similarAccidentRanking])

  const exactAircraftHistory = useMemo(() => {
    if (!accident.aircraft) return []
    return allAccidents
      .filter((item) => item.id !== accident.id && item.aircraft === accident.aircraft)
      .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
      .slice(0, 20)
  }, [accident, allAccidents])

  const familyAircraftHistory = useMemo(() => {
    if (!accident.family) return []
    return allAccidents
      .filter((item) => item.id !== accident.id && item.family === accident.family)
      .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
      .slice(0, 25)
  }, [accident, allAccidents])

  const aircraftHistoryRows = exactAircraftHistory.length ? exactAircraftHistory : familyAircraftHistory

  const hypotheses = useMemo(() => {
    if (accident.sourceTier === 'discovery') return []
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
          <small>Meteoroloji · uçuş safhası · sistem/air-data · kontrol kaybı zinciri</small>
        </div>
        <AccidentHistoryTable rows={similarAccidents} reasonsById={similarityReasons} emptyText="Teknik benzerlik eşiğini geçen geçmiş vaka bulunamadı." />
      </div>

      <div className="accident-history-section aircraft-type-history-section">
        <div className="dashboard-section-title">
          <span>Uçak tipi ve geçmiş kaza geçmişi</span>
          <small>{exactAircraftHistory.length ? 'Aynı tam uçak tipi' : 'Tam tip kaydı yoksa aynı uçak ailesi'}</small>
        </div>

        <div className="aircraft-type-summary">
          <div><span>Uçak tipi</span><strong>{accident.aircraft || 'Bilinmiyor'}</strong></div>
          <div><span>Uçak ailesi</span><strong>{accident.family || 'Bilinmiyor'}</strong></div>
          <div><span>Kaza anındaki yaşı</span><strong>{typeof accident.aircraftAgeYears === 'number' ? accident.aircraftAgeYears.toFixed(1) + ' yıl' : 'Bilinmiyor'}</strong></div>
        </div>

        <AircraftTypeHistoryTable
          rows={aircraftHistoryRows}
          emptyText="Bu uçak tipi/ailesi için indekslenmiş başka geçmiş kaza bulunamadı."
        />
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
