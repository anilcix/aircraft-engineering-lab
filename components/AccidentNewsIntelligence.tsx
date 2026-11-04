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
  flightNumber?: string
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

const CAUSE_CATEGORIES = [
  { key:'weather', label:'Hava muhalefeti', words:['bad weather','weather','storm','thunderstorm','convective','turbulence','wind shear','windshear','microburst','fog','visibility','precipitation','heavy rain','hail'] },
  { key:'icing', label:'Buzlanma', words:['icing','ice ','clear ice','airframe ice','wing ice','pitot icing','ice accretion'] },
  { key:'controls', label:'Kontrol yüzeyi / uçuş kumandası kaybı', words:['flight control','control surface','elevator','rudder','aileron','control jam','jammed','loss of control','loc-i','uncommanded','control failure'] },
  { key:'structure', label:'Yapısal hasar', words:['structural','structure failure','breakup','in-flight breakup','fracture','fatigue','crack','separation','pylon','fuselage rupture','wing failure'] },
  { key:'intentional', label:'Pilot intiharı / kasıtlı eylem', words:['suicide','deliberate','intentional','intentionally','murder-suicide','locked cockpit','deliberately crashed','pilot incapacitation by intent'] },
  { key:'sensor', label:'Sensör / Air-data arızası', words:['sensor','pitot','air data','airspeed','air speed','erroneous speed','unreliable speed','angle of attack','aoa','instrument indication'] },
  { key:'engine', label:'Motor / itki arızası', words:['engine failure','engine','thrust loss','loss of thrust','flameout','compressor','fan blade','propulsion','uncontained engine'] },
  { key:'fuel', label:'Yakıt problemi', words:['fuel exhaustion','fuel starvation','fuel leak','fuel contamination','fuel system','ran out of fuel'] },
  { key:'systems', label:'Elektrik / hidrolik / aviyonik arıza', words:['electrical','hydraulic','avionics','autopilot','flight computer','system failure','power failure','generator failure'] },
  { key:'maintenance', label:'Bakım / inspeksiyon hatası', words:['maintenance','inspection','overhaul','repair error','improper maintenance','missed inspection','service bulletin','maintenance error'] },
  { key:'atc', label:'ATC / havaalanı operasyonu', words:['atc','controller','clearance','runway incursion','wrong runway','airport lighting','ground collision','runway collision'] },
  { key:'external', label:'Bird strike / FOD / harici etken', words:['bird strike','bird','fod','foreign object','debris','drone','missile','shot down'] },
  { key:'unknown', label:'Diğer / bilinmiyor', words:[] },
]

type CauseProbability = { key:string; label:string; probability:number; evidence:string[] }

function categoryScores(accident: AccidentRow, articles: Article[]): CauseProbability[] {
  const baseParts = [accident.title, accident.summary, accident.location]
  const official = accident.probableCause || ''
  const articleText = articles.map((a) => [a.title, a.summary].filter(Boolean).join(' ')).join(' ')
  const base = baseParts.filter(Boolean).join(' ').toLowerCase()
  const officialText = official.toLowerCase()
  const newsText = articleText.toLowerCase()

  const scored = CAUSE_CATEGORIES.filter((cat) => cat.key !== 'unknown').map((cat) => {
    let score = 0
    const evidence:string[] = []
    for (const word of cat.words) {
      if (officialText.includes(word)) {
        score += 8
        if (!evidence.includes('Resmî bulgu/rapor')) evidence.push('Resmî bulgu/rapor')
      }
      if (base.includes(word)) {
        score += 3
        if (!evidence.includes('Olay özeti')) evidence.push('Olay özeti')
      }
      const matchingArticles = articles.filter((a) => ([a.title, a.summary].filter(Boolean).join(' ').toLowerCase()).includes(word))
      if (matchingArticles.length) {
        score += Math.min(6, matchingArticles.length * 2)
        for (const a of matchingArticles.slice(0,2)) if (!evidence.includes(a.source)) evidence.push(a.source)
      }
    }
    return { key:cat.key, label:cat.label, score, evidence:evidence.slice(0,4) }
  })

  const active = scored.filter((x) => x.score > 0)
  if (!active.length) {
    return [{ key:'unknown', label:'Diğer / bilinmiyor', probability:100, evidence:['Mevcut kanıt yetersiz'] }]
  }

  // A small residual prevents the UI from implying certainty before investigation is complete.
  const uncertainty = accident.probableCause?.trim() ? 4 : Math.max(12, 30 - Math.min(18, articles.length * 3))
  const rawTotal = active.reduce((sum,x)=>sum+x.score,0)
  const available = 100 - uncertainty
  const rows = active
    .map((x) => ({ key:x.key, label:x.label, probability:Math.max(1, Math.round((x.score/rawTotal)*available)), evidence:x.evidence }))
    .sort((a,b)=>b.probability-a.probability)

  let sum = rows.reduce((s,x)=>s+x.probability,0)
  if (rows.length && sum !== available) rows[0].probability += available - sum
  rows.push({ key:'unknown', label:'Diğer / bilinmiyor', probability:uncertainty, evidence:[accident.probableCause?.trim() ? 'Artık belirsizlik payı' : 'Soruşturma tamamlanmadı'] })
  return rows.sort((a,b)=>b.probability-a.probability)
}

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

function inferAircraftFromEvidence(item: AccidentRow, articles: Article[]) {
  if (item.aircraft?.trim()) return item.aircraft.trim()
  const text = [item.title, item.summary, ...articles.map((a) => [a.title, a.summary].filter(Boolean).join(' '))]
    .filter(Boolean).join(' ')
  const patterns: Array<[RegExp, string]> = [
    [/\bLearjet\s*60\b/i, 'Learjet 60'],
    [/\bLearjet\s*55\b/i, 'Learjet 55'],
    [/\bLearjet\s*45\b/i, 'Learjet 45'],
    [/\bBoeing\s*787[- ]?8\b/i, 'Boeing 787-8'],
    [/\bBoeing\s*787[- ]?9\b/i, 'Boeing 787-9'],
    [/\bBoeing\s*777[- ]?300ER\b/i, 'Boeing 777-300ER'],
    [/\bBoeing\s*777[- ]?200ER\b/i, 'Boeing 777-200ER'],
    [/\bBoeing\s*737[- ]?800\b/i, 'Boeing 737-800'],
    [/\bBoeing\s*737\s*MAX\s*8\b/i, 'Boeing 737 MAX 8'],
    [/\bAirbus\s*A330[- ]?203\b/i, 'Airbus A330-203'],
    [/\bAirbus\s*A320[- ]?\d{3}\b/i, text.match(/\bAirbus\s*A320[- ]?\d{3}\b/i)?.[0] || 'Airbus A320'],
    [/\bAirbus\s*A350[- ]?\d{3}\b/i, text.match(/\bAirbus\s*A350[- ]?\d{3}\b/i)?.[0] || 'Airbus A350'],
    [/\bATR\s*72(?:[- ]?\d{3})?\b/i, text.match(/\bATR\s*72(?:[- ]?\d{3})?\b/i)?.[0] || 'ATR 72'],
    [/\bCRJ[- ]?900(?:LR)?\b/i, 'CRJ-900LR'],
    [/\bCRJ[- ]?200(?:LR)?\b/i, 'CRJ-200LR'],
    [/\bEmbraer\s*190(?:AR)?\b/i, 'Embraer 190'],
  ]
  for (const [pattern, label] of patterns) if (pattern.test(text)) return label
  return ''
}

function inferFamilyFromAircraft(aircraft: string, fallback?: string) {
  if (fallback?.trim()) return fallback.trim()
  const s = aircraft.toUpperCase()
  if (s.includes('LEARJET 60')) return 'Learjet 60'
  if (s.includes('LEARJET')) return 'Learjet'
  if (s.includes('787')) return 'Boeing 787'
  if (s.includes('777')) return 'Boeing 777'
  if (s.includes('737 MAX')) return 'Boeing 737 MAX'
  if (s.includes('737')) return 'Boeing 737 Family'
  if (s.includes('A350')) return 'Airbus A350'
  if (s.includes('A330')) return 'Airbus A330'
  if (s.includes('A320') || s.includes('A319') || s.includes('A321') || s.includes('A318')) return 'Airbus A320 Family'
  if (s.includes('ATR 72')) return 'ATR 72'
  if (s.includes('CRJ')) return 'Bombardier CRJ'
  if (s.includes('EMBRAER 190')) return 'Embraer E-Jet'
  return aircraft
}

function inferredFlightNumber(item: AccidentRow) {
  if (item.flightNumber?.trim()) return item.flightNumber.trim()
  const title = item.title || ''
  const flightMatch = title.match(/\b(?:flight|flt)\s*([A-Z]{0,3}\s*\d{1,4}[A-Z]?)\b/i)
  if (flightMatch?.[1]) return flightMatch[1].replace(/\s+/g, ' ').trim().toUpperCase()
  const carrierMatch = title.match(/\b(Air France|Lion Air|Ethiopian(?: Airlines)?|Malaysia Airlines|United Airlines|American Airlines|Turkish Airlines|Japan Airlines|Korean Air|Swissair|TWA|Pan Am)\s+(?:Flight\s*)?(\d{2,4}[A-Z]?)\b/i)
  if (carrierMatch) return carrierMatch[1] + ' ' + carrierMatch[2]
  const codeMatch = title.match(/\b([A-Z]{2,3}\s?\d{2,4}[A-Z]?)\b/)
  if (codeMatch?.[1]) return codeMatch[1].replace(/\s+/g, '')
  return '—'
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
          <th>Uçuş</th>
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
          <td className="flight-number-cell">{inferredFlightNumber(row)}</td>
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
          <th>Uçuş</th>
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
          <td className="flight-number-cell">{inferredFlightNumber(row)}</td>
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

  const inferredAircraft = useMemo(() => inferAircraftFromEvidence(accident, articles), [accident, articles])
  const inferredFamily = useMemo(() => inferFamilyFromAircraft(inferredAircraft, accident.family), [inferredAircraft, accident.family])
  const enrichedAccident = useMemo(() => ({ ...accident, aircraft: accident.aircraft || inferredAircraft || undefined, family: accident.family || inferredFamily || undefined }), [accident, inferredAircraft, inferredFamily])
  const causeProbabilities = useMemo(() => categoryScores(enrichedAccident, articles), [enrichedAccident, articles])

  const selectedEvidenceText = useMemo(() => {
    return articles.map((article) => [article.title, article.summary].filter(Boolean).join(' ')).join(' ').toLowerCase()
  }, [articles])

  const similarAccidentRanking = useMemo(() => {
    return allAccidents
      .map((item) => ({ item, ...similarityDetails(enrichedAccident, item, selectedEvidenceText) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || (Date.parse(b.item.date || '') || 0) - (Date.parse(a.item.date || '') || 0))
      .slice(0, 10)
  }, [enrichedAccident, allAccidents, selectedEvidenceText])

  const similarAccidents = useMemo(() => similarAccidentRanking.map((row) => row.item), [similarAccidentRanking])
  const similarityReasons = useMemo(() => Object.fromEntries(similarAccidentRanking.map((row) => [row.item.id, row.reasons])), [similarAccidentRanking])

  const exactAircraftHistory = useMemo(() => {
    if (!enrichedAccident.aircraft) return []
    return allAccidents
      .filter((item) => item.id !== accident.id && item.aircraft === enrichedAccident.aircraft)
      .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
      .slice(0, 20)
  }, [enrichedAccident, accident.id, allAccidents])

  const familyAircraftHistory = useMemo(() => {
    if (!enrichedAccident.family) return []
    return allAccidents
      .filter((item) => item.id !== accident.id && item.family === enrichedAccident.family)
      .sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
      .slice(0, 25)
  }, [enrichedAccident, accident.id, allAccidents])

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
      <section className="accident-cause-summary">
        <div className="dashboard-section-title">
          <span>Kaza özeti ve olası neden dağılımı</span>
          <small>Kanıt ağırlıklı erken değerlendirme · resmî probable cause değildir</small>
        </div>
        <div className="accident-cause-meta">
          <div><span>Uçuş numarası</span><strong>{inferredFlightNumber(enrichedAccident)}</strong></div>
          <div><span>Uçak tipi</span><strong>{enrichedAccident.aircraft || enrichedAccident.family || 'Bilinmiyor'}</strong></div>
          <div><span>Uçak ailesi</span><strong>{enrichedAccident.family || 'Bilinmiyor'}</strong></div>
          <div><span>Ölü sayısı</span><strong>{typeof accident.fatalities === 'number' ? accident.fatalities : 'Bilinmiyor'}</strong></div>
          <div><span>Kaza anındaki yaş</span><strong>{typeof accident.aircraftAgeYears === 'number' ? accident.aircraftAgeYears.toFixed(1) + ' yıl' : 'Bilinmiyor'}</strong></div>
        </div>
        <div className="cause-probability-list">
          {causeProbabilities.map((row) => <div className="cause-probability-row" key={row.key}>
            <div className="cause-probability-label">
              <strong>{row.label}</strong>
              <span>%{row.probability}</span>
            </div>
            <div className="cause-probability-track"><span style={{width:`${row.probability}%`}} /></div>
            <small>{row.evidence.join(' · ')}</small>
          </div>)}
        </div>
        <p className="cause-probability-note">Yüzdeler soruşturma sonucu değildir; mevcut resmî bulgulara, olay özetine ve güvenilir haber kaynaklarında tekrar eden teknik belirtilere göre normalize edilmiş kanıt ağırlığıdır. Yeni kanıt geldikçe değişir.</p>
      </section>

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
          <div><span>Uçak tipi</span><strong>{enrichedAccident.aircraft || 'Bilinmiyor'}</strong></div>
          <div><span>Uçak ailesi</span><strong>{enrichedAccident.family || 'Bilinmiyor'}</strong></div>
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
