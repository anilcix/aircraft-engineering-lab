'use client'

import { useEffect, useMemo, useState } from 'react'

type Accident = {
  id: string
  date: string
  title: string
  operator?: string
  aircraft?: string
  family?: string
  manufacturer?: string
  aircraftAgeYears?: number
  location?: string
  fatalities?: number
  survivors?: number
  authority: string
  status: string
  summary: string
  probableCause?: string
  reportUrl?: string
  sourceUrl: string
  videoUrl?: string
  discoveryArticleUrl?: string
  sourceTier?: 'official' | 'discovery'
  verificationStatus?: string
}

type LegacyFleetProfile = {
  family: string
  status: string
  currentOperators: string[]
  checkedAt: string
  sourceLabel: string
  sourceUrl?: string
  note?: string
}

type AccidentPayload = {
  updatedAt: string
  coverageNote: string
  discoveryNote?: string
  ageNote?: string
  counts?: {
    officialIndexed: number
    discovery: number
    totalVisible: number
  }
  fleetProfiles?: LegacyFleetProfile[]
  items: Accident[]
}

type CauseStat = {
  category: string
  count: number
  percentOfEvents: number
}

type OperatorStat = {
  operator: string
  accidents: number
  fatalAccidents: number
  fatalities: number
  avgAccidentAircraftAgeYears?: number
  families?: string[]
}

type NtsbTypeStat = {
  family: string
  make: string
  model: string
  accidents: number
  fatalAccidents: number
  fatalities: number
  avgAgeYears?: number
  minAgeYears?: number
  maxAgeYears?: number
  sampleOperators?: string[]
  causeCategories?: CauseStat[]
  operatorStats?: OperatorStat[]
}

type NtsbPayload = {
  generatedAt: string
  coverageNote: string
  causeMethodNote?: string
  totalAccidents: number
  recognizedAccidentEvents?: number
  totalAircraftRecords?: number
  causeCategories?: CauseStat[]
  operatorStats?: OperatorStat[]
  types: NtsbTypeStat[]
}

type FleetOperatorSnapshot = {
  airline: string
  variant: string
  fleetCount: number
  avgAgeYears: number
  sourceLabel: string
  sourceUrl: string
  sourceUpdatedAt: string
  note?: string
}

type CurrentFleetProfile = {
  family: string
  status: string
  checkedAt: string
  currentOperators: string[]
  operatorSnapshots: FleetOperatorSnapshot[]
  note?: string
}

type FleetPayload = {
  updatedAt: string
  methodNote: string
  profiles: CurrentFleetProfile[]
}

type FamilySummary = {
  family: string
  accidents: number
  fatalAccidents: number
  fatalities: number
  avgAgeYears?: number
  minAgeYears?: number
  maxAgeYears?: number
}

const FALLBACK: AccidentPayload = {
  updatedAt: '2026-08-16T16:40:00Z',
  coverageNote: 'Federated global airline safety index. This is not a complete global census.',
  items: [],
  fleetProfiles: [],
}

const NTSB_FALLBACK: NtsbPayload = {
  generatedAt: '1970-01-01T00:00:00Z',
  coverageNote: 'NTSB bulk statistics have not been generated yet.',
  totalAccidents: 0,
  types: [],
  causeCategories: [],
  operatorStats: [],
}

const FLEET_FALLBACK: FleetPayload = {
  updatedAt: '1970-01-01T00:00:00Z',
  methodNote: 'Current fleet snapshots have not loaded yet.',
  profiles: [],
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, x) => sum + x, 0) / values.length : undefined
}

function ageText(value?: number) {
  return typeof value === 'number' ? `${value.toFixed(1)} yıl` : '—'
}

function familySummaries(items: Accident[]): FamilySummary[] {
  const map = new Map<string, Accident[]>()
  for (const item of items) {
    const key = item.family || item.aircraft || 'Unknown'
    map.set(key, [...(map.get(key) || []), item])
  }
  return Array.from(map.entries()).map(([family, rows]) => {
    const ages = rows.map((x) => x.aircraftAgeYears).filter((x): x is number => typeof x === 'number')
    return {
      family,
      accidents: rows.length,
      fatalAccidents: rows.filter((x) => (x.fatalities || 0) > 0).length,
      fatalities: rows.reduce((sum, x) => sum + (x.fatalities || 0), 0),
      avgAgeYears: average(ages),
      minAgeYears: ages.length ? Math.min(...ages) : undefined,
      maxAgeYears: ages.length ? Math.max(...ages) : undefined,
    }
  }).sort((a, b) => b.accidents - a.accidents || b.fatalities - a.fatalities)
}

function FactorBars({ rows }: { rows: CauseStat[] }) {
  const max = Math.max(1, ...rows.map((x) => x.count))
  return (
    <div className="factor-list">
      {rows.map((row) => (
        <div className="factor-row" key={row.category}>
          <div className="factor-label"><strong>{row.category}</strong><span>{row.count} olay · %{row.percentOfEvents.toFixed(1)}</span></div>
          <div className="factor-bar"><span style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

function OperatorTable({ rows }: { rows: OperatorStat[] }) {
  return (
    <div className="operator-table">
      <div className="operator-table-head"><span>Operator</span><span>Olay</span><span>Fatal</span><span>Ölüm</span><span>Ort. kaza yaşı</span></div>
      {rows.map((row) => (
        <div className="operator-table-row" key={row.operator}>
          <strong>{row.operator}</strong>
          <span>{row.accidents}</span>
          <span>{row.fatalAccidents}</span>
          <span>{row.fatalities.toLocaleString('tr-TR')}</span>
          <span>{ageText(row.avgAccidentAircraftAgeYears)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AviationAccidentsDrawer() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<AccidentPayload>(FALLBACK)
  const [ntsb, setNtsb] = useState<NtsbPayload>(NTSB_FALLBACK)
  const [fleet, setFleet] = useState<FleetPayload>(FLEET_FALLBACK)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('All')
  const [selected, setSelected] = useState<Accident | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null)
  const [mode, setMode] = useState<'dashboard' | 'cases'>('dashboard')
  const [scope, setScope] = useState<'global' | 'discovery' | 'ntsb'>('global')

  useEffect(() => {
    fetch('./aviation-accidents.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: AccidentPayload) => setPayload(data))
      .catch(() => undefined)

    fetch('./ntsb-accident-stats.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: NtsbPayload) => setNtsb(data))
      .catch(() => undefined)

    fetch('./current-fleet-snapshots.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: FleetPayload) => setFleet(data))
      .catch(() => undefined)
  }, [])

  const legacyProfiles = useMemo(() => new Map((payload.fleetProfiles || []).map((x) => [x.family, x])), [payload])
  const currentProfiles = useMemo(() => new Map(fleet.profiles.map((x) => [x.family, x])), [fleet])
  const officialItems = useMemo(() => payload.items.filter((x) => x.sourceTier !== 'discovery'), [payload])
  const discoveryItems = useMemo(() => payload.items.filter((x) => x.sourceTier === 'discovery'), [payload])
  const officialFamilies = useMemo(() => familySummaries(officialItems), [officialItems])
  const discoveryFamilies = useMemo(() => familySummaries(discoveryItems), [discoveryItems])

  const years = useMemo(() => {
    const values = Array.from(new Set(payload.items.map((x) => x.date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a))
    return ['All', ...values]
  }, [payload])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payload.items.filter((item) => {
      const matchesYear = year === 'All' || item.date.startsWith(year)
      const haystack = `${item.title} ${item.operator ?? ''} ${item.aircraft ?? ''} ${item.family ?? ''} ${item.location ?? ''} ${item.authority} ${item.summary}`.toLowerCase()
      return matchesYear && (!q || haystack.includes(q))
    })
  }, [payload, query, year])

  const totalFatalities = useMemo(() => officialItems.reduce((sum, x) => sum + (x.fatalities || 0), 0), [officialItems])
  const fatalCases = useMemo(() => officialItems.filter((x) => (x.fatalities || 0) > 0).length, [officialItems])
  const allAges = useMemo(() => officialItems.map((x) => x.aircraftAgeYears).filter((x): x is number => typeof x === 'number'), [officialItems])
  const avgGlobalAge = average(allAges)

  const dashboardRows: FamilySummary[] = useMemo(() => {
    if (scope === 'ntsb' && ntsb.types.length) {
      return ntsb.types.slice(0, 30).map((x) => ({
        family: x.family,
        accidents: x.accidents,
        fatalAccidents: x.fatalAccidents,
        fatalities: x.fatalities,
        avgAgeYears: x.avgAgeYears,
        minAgeYears: x.minAgeYears,
        maxAgeYears: x.maxAgeYears,
      }))
    }
    if (scope === 'discovery') return discoveryFamilies.slice(0, 80)
    return officialFamilies
  }, [scope, ntsb, officialFamilies, discoveryFamilies])

  const maxCount = Math.max(1, ...dashboardRows.map((x) => x.accidents))
  const globalFamily = selectedFamily ? officialFamilies.find((x) => x.family === selectedFamily) : undefined
  const discoveryFamily = selectedFamily ? discoveryFamilies.find((x) => x.family === selectedFamily) : undefined
  const activeFamily = selectedFamily ? dashboardRows.find((x) => x.family === selectedFamily) || globalFamily || discoveryFamily : undefined
  const activeCases = selectedFamily ? payload.items.filter((x) => (x.family || x.aircraft) === selectedFamily) : []
  const activeNtsb = selectedFamily ? ntsb.types.find((x) => x.family === selectedFamily) : undefined
  const activeFleet = selectedFamily ? currentProfiles.get(selectedFamily) : undefined
  const legacyFleet = selectedFamily ? legacyProfiles.get(selectedFamily) : undefined

  const documentarySearch = (item: Accident) => item.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} aviation accident documentary analysis`)}`
  const scopeCoverage = scope === 'ntsb'
    ? ntsb.coverageNote
    : scope === 'discovery'
      ? (payload.discoveryNote || 'Secondary global discovery records awaiting official-source verification.')
      : payload.coverageNote

  return (
    <>
      <button className="side-tool accident-tool" onClick={() => setOpen(true)}>Uçak Kazaları</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open accidents-drawer safety-dashboard-drawer' : 'info-drawer accidents-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">AVIATION SAFETY INTELLIGENCE</div>
            <h2>Uçak Kazaları Dashboard</h2>
            <p>Resmî global indeks · geniş discovery katmanı · NTSB bulk · filo yaşı</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="safety-mode-tabs">
          <button className={mode === 'dashboard' ? 'active' : ''} onClick={() => { setMode('dashboard'); setSelected(null) }}>Dashboard</button>
          <button className={mode === 'cases' ? 'active' : ''} onClick={() => { setMode('cases'); setSelectedFamily(null) }}>Olay Kütüphanesi</button>
        </div>

        {mode === 'dashboard' && !selectedFamily && (
          <>
            <div className="accident-coverage">{scopeCoverage}</div>
            <div className="scope-switch">
              <button className={scope === 'global' ? 'active' : ''} onClick={() => setScope('global')}>Official global</button>
              <button className={scope === 'discovery' ? 'active' : ''} onClick={() => setScope('discovery')}>Global discovery</button>
              <button className={scope === 'ntsb' ? 'active' : ''} onClick={() => setScope('ntsb')}>NTSB bulk</button>
            </div>

            <div className="safety-kpis">
              {scope === 'global' ? (
                <>
                  <div><small>Official indexed cases</small><strong>{officialItems.length}</strong></div>
                  <div><small>Fatal indexed cases</small><strong>{fatalCases}</strong></div>
                  <div><small>Verified indexed fatalities</small><strong>{totalFatalities.toLocaleString('tr-TR')}</strong></div>
                  <div><small>Avg aircraft age</small><strong>{ageText(avgGlobalAge)}</strong></div>
                </>
              ) : scope === 'discovery' ? (
                <>
                  <div><small>Discovery records</small><strong>{discoveryItems.length.toLocaleString('tr-TR')}</strong></div>
                  <div><small>Verification</small><strong>Pending</strong></div>
                  <div><small>Source tier</small><strong>Secondary</strong></div>
                  <div><small>Purpose</small><strong>Coverage</strong></div>
                </>
              ) : (
                <>
                  <div><small>NTSB all accident records</small><strong>{ntsb.totalAccidents ? ntsb.totalAccidents.toLocaleString('tr-TR') : '—'}</strong></div>
                  <div><small>Recognized transport-family event</small><strong>{ntsb.recognizedAccidentEvents ?? '—'}</strong></div>
                  <div><small>Scope</small><strong>US/NTSB</strong></div>
                  <div><small>Avg aircraft age</small><strong>Tip bazında</strong></div>
                </>
              )}
            </div>

            {scope === 'ntsb' && (ntsb.causeCategories || []).length > 0 && (
              <section className="dashboard-block">
                <div className="dashboard-section-title"><span>Cause / contributing factor distribution</span><small>Multi-label · NTSB Findings türevi</small></div>
                <FactorBars rows={(ntsb.causeCategories || []).slice(0, 9)} />
                <p className="method-note">{ntsb.causeMethodNote}</p>
              </section>
            )}

            {scope === 'ntsb' && (ntsb.operatorStats || []).length > 0 && (
              <section className="dashboard-block">
                <div className="dashboard-section-title"><span>Operator accident ranking</span><small>NTSB kapsamı · transport aileleri</small></div>
                <OperatorTable rows={(ntsb.operatorStats || []).slice(0, 12)} />
              </section>
            )}

            <div className="type-ranking">
              <div className="dashboard-section-title">
                <span>Aircraft type ranking</span>
                <small>{scope === 'ntsb' ? 'NTSB kapsamı — global toplam değil' : scope === 'discovery' ? 'Secondary discovery — doğrulama bekliyor' : 'Official-source federated index'}</small>
              </div>
              {dashboardRows.map((row) => {
                const current = currentProfiles.get(row.family)
                const legacy = legacyProfiles.get(row.family)
                return (
                  <button className="type-row" key={`${scope}-${row.family}`} onClick={() => setSelectedFamily(row.family)}>
                    <div className="type-row-main">
                      <strong>{row.family}</strong>
                      <span>{scope === 'ntsb'
                        ? `${row.accidents} NTSB olay · ${row.fatalAccidents} fatal · ${row.fatalities.toLocaleString('tr-TR')} NTSB-scope ölüm`
                        : scope === 'discovery'
                          ? `${row.accidents} discovery kayıt · ölüm verisi varsa toplam ${row.fatalities.toLocaleString('tr-TR')}`
                          : `${row.accidents} official-index olay · ${row.fatalAccidents} fatal · ${row.fatalities.toLocaleString('tr-TR')} ölüm`}</span>
                    </div>
                    <div className="type-bar"><span style={{ width: `${Math.max(4, (row.accidents / maxCount) * 100)}%` }} /></div>
                    <div className="type-row-age"><small>Ort. kaza yaşı</small><strong>{ageText(row.avgAgeYears)}</strong></div>
                    <div className="type-row-service"><small>Bugünkü filo</small><strong>{current?.status || legacy?.status || 'Snapshot yok'}</strong></div>
                  </button>
                )
              })}
            </div>

            <div className="dashboard-note">{scope === 'global' ? payload.ageNote : scope === 'discovery' ? 'Discovery katmanındaki ölüm, tarih, operatör ve uçak tipi alanları eksik olabilir. Resmî dashboard toplamlarına doğrulanmadan eklenmez.' : ntsb.causeMethodNote}</div>
          </>
        )}

        {mode === 'dashboard' && selectedFamily && (
          <div className="type-detail-dashboard">
            <button className="back-link" onClick={() => setSelectedFamily(null)}>← Tip sıralamasına dön</button>
            <div className="eyebrow">AIRCRAFT TYPE SAFETY PROFILE</div>
            <h3>{selectedFamily}</h3>

            <div className="scope-compare">
              <div><small>Official global index</small><strong>{globalFamily ? `${globalFamily.accidents} olay · ${globalFamily.fatalAccidents} fatal · ${globalFamily.fatalities.toLocaleString('tr-TR')} ölüm` : 'Official detay kayıt yok'}</strong></div>
              <div><small>Discovery layer</small><strong>{discoveryFamily ? `${discoveryFamily.accidents} discovery kayıt` : 'Ek discovery kaydı yok'}</strong></div>
              <div><small>NTSB bulk</small><strong>{activeNtsb ? `${activeNtsb.accidents} olay · ${activeNtsb.fatalAccidents} fatal · ${activeNtsb.fatalities.toLocaleString('tr-TR')} ölüm` : 'NTSB tip kaydı yok'}</strong></div>
            </div>

            <div className="safety-kpis compact">
              <div><small>Official indexed fatalities</small><strong>{globalFamily?.fatalities.toLocaleString('tr-TR') ?? '—'}</strong></div>
              <div><small>NTSB accidents</small><strong>{activeNtsb?.accidents ?? '—'}</strong></div>
              <div><small>Avg accident age</small><strong>{ageText(activeNtsb?.avgAgeYears ?? globalFamily?.avgAgeYears ?? activeFamily?.avgAgeYears)}</strong></div>
              <div><small>Age range</small><strong>{activeNtsb?.minAgeYears != null && activeNtsb?.maxAgeYears != null ? `${activeNtsb.minAgeYears.toFixed(0)}–${activeNtsb.maxAgeYears.toFixed(0)} y` : globalFamily?.minAgeYears != null && globalFamily?.maxAgeYears != null ? `${globalFamily.minAgeYears.toFixed(0)}–${globalFamily.maxAgeYears.toFixed(0)} y` : '—'}</strong></div>
            </div>

            {(activeNtsb?.causeCategories || []).length > 0 && (
              <section>
                <div className="dashboard-section-title"><span>Bu tipte neden / katkı faktörleri</span><small>NTSB Findings · multi-label</small></div>
                <FactorBars rows={(activeNtsb?.causeCategories || []).slice(0, 9)} />
                <p className="method-note">Aynı accident event birden fazla faktörde sayılabilir; bu yüzden kategoriler toplamı %100 olmak zorunda değildir.</p>
              </section>
            )}

            {(activeNtsb?.operatorStats || []).length > 0 && (
              <section>
                <div className="dashboard-section-title"><span>Bu tipte geçmiş operator kayıtları</span><small>NTSB kapsamı</small></div>
                <OperatorTable rows={(activeNtsb?.operatorStats || []).slice(0, 12)} />
              </section>
            )}

            <section className="fleet-snapshot">
              <div className="dashboard-section-title"><span>Current fleet snapshot</span><small>{activeFleet ? `Kontrol: ${activeFleet.checkedAt}` : legacyFleet ? `Kontrol: ${legacyFleet.checkedAt}` : 'Henüz yok'}</small></div>
              {activeFleet ? (
                <>
                  <strong className="fleet-status">{activeFleet.status}</strong>
                  <div className="operator-chips">{activeFleet.currentOperators.map((x) => <span key={x}>{x}</span>)}</div>
                  {activeFleet.operatorSnapshots.length > 0 && (
                    <div className="fleet-age-table">
                      <div className="fleet-age-head"><span>Havayolu</span><span>Tip / alt tip</span><span>Adet</span><span>Ort. yaş</span><span>Kaynak tarihi</span></div>
                      {activeFleet.operatorSnapshots.map((row) => (
                        <a className="fleet-age-row" href={row.sourceUrl} target="_blank" rel="noreferrer" key={`${row.airline}-${row.variant}`}>
                          <strong>{row.airline}</strong><span>{row.variant}</span><span>{row.fleetCount}</span><span>{row.avgAgeYears.toFixed(1)} yıl</span><span>{row.sourceUpdatedAt}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {activeFleet.note && <p>{activeFleet.note}</p>}
                  <p className="method-note">{fleet.methodNote}</p>
                </>
              ) : legacyFleet ? (
                <>
                  <strong className="fleet-status">{legacyFleet.status}</strong>
                  <div className="operator-chips">{legacyFleet.currentOperators.map((x) => <span key={x}>{x}</span>)}</div>
                  {legacyFleet.note && <p>{legacyFleet.note}</p>}
                  {legacyFleet.sourceUrl && <a href={legacyFleet.sourceUrl} target="_blank" rel="noreferrer">Fleet kaynağını aç ↗</a>}
                </>
              ) : <p>Bu uçak tipi için güncel operatör/yaş snapshot’ı henüz eklenmedi.</p>}
            </section>

            <section>
              <h4>İndeksteki ilgili olaylar</h4>
              {activeCases.length ? activeCases.map((item) => (
                <button className="accident-mini-row" key={item.id} onClick={() => { setSelected(item); setMode('cases') }}>
                  <span>{item.date}</span><strong>{item.title}</strong><small>{item.sourceTier === 'discovery' ? 'DISCOVERY' : item.aircraftAgeYears != null ? `~${item.aircraftAgeYears.toFixed(1)} yaş · ${item.fatalities ?? 0} ölüm` : `${item.fatalities ?? 0} ölüm`}</small>
                </button>
              )) : <p>Bu tip için henüz vaka kartı yok.</p>}
            </section>
          </div>
        )}

        {mode === 'cases' && selected ? (
          <div className="accident-detail">
            <button className="back-link" onClick={() => setSelected(null)}>← Listeye dön</button>
            <div className="news-meta">
              <span>{selected.date}</span><span>{selected.authority}</span><span>{selected.status}</span>
              <span>{selected.sourceTier === 'discovery' ? 'DISCOVERY · VERIFY' : 'OFFICIAL INDEX'}</span>
            </div>
            <h3>{selected.title}</h3>
            <div className="accident-grid">
              {selected.aircraft && <div><small>Aircraft</small><strong>{selected.aircraft}</strong></div>}
              {selected.family && <div><small>Family</small><strong>{selected.family}</strong></div>}
              {selected.operator && <div><small>Operator</small><strong>{selected.operator}</strong></div>}
              {selected.location && <div><small>Location</small><strong>{selected.location}</strong></div>}
              {typeof selected.aircraftAgeYears === 'number' && <div><small>Approx. aircraft age</small><strong>{selected.aircraftAgeYears.toFixed(1)} yıl</strong></div>}
              {typeof selected.fatalities === 'number' && <div><small>Fatalities</small><strong>{selected.fatalities}</strong></div>}
              {typeof selected.survivors === 'number' && <div><small>Survivors</small><strong>{selected.survivors}</strong></div>}
            </div>
            {selected.sourceTier === 'discovery' && <div className="accident-coverage">Bu kayıt kapsam keşfi içindir. Resmî soruşturma otoritesiyle doğrulanmadan cause/fatality istatistiğine authoritative veri olarak katılmaz.</div>}
            <section><h4>Olay özeti</h4><p>{selected.summary}</p></section>
            {selected.probableCause && <section><h4>Probable cause / bulgular</h4><p>{selected.probableCause}</p></section>}
            <div className="accident-links">
              {selected.reportUrl && <a href={selected.reportUrl} target="_blank" rel="noreferrer">Resmî rapor ↗</a>}
              <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceTier === 'discovery' ? 'Discovery kaynağı ↗' : 'Soruşturma kaynağı ↗'}</a>
              {selected.discoveryArticleUrl && <a href={selected.discoveryArticleUrl} target="_blank" rel="noreferrer">Olay sayfası ↗</a>}
              <a href={documentarySearch(selected)} target="_blank" rel="noreferrer">Video / belgesel ara ↗</a>
            </div>
          </div>
        ) : mode === 'cases' ? (
          <>
            <div className="accident-coverage">{payload.coverageNote}</div>
            <div className="cert-controls accident-controls">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Uçuş, uçak, aile, operatör, ülke..." />
              <select value={year} onChange={(e) => setYear(e.target.value)}>{years.map((x) => <option key={x}>{x}</option>)}</select>
            </div>
            <div className="news-list">
              {filtered.map((item) => (
                <button className="accident-card" key={item.id} onClick={() => setSelected(item)}>
                  <div className="news-meta">
                    <span>{item.date}</span><span>{item.authority}</span><span>{item.sourceTier === 'discovery' ? 'DISCOVERY' : 'OFFICIAL'}</span>
                    {item.aircraftAgeYears != null && <span>~{item.aircraftAgeYears.toFixed(1)} yaş</span>}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{[item.aircraft, item.operator, item.location].filter(Boolean).join(' · ')}</p>
                  <div className="accident-card-foot"><span>{item.status}</span>{typeof item.fatalities === 'number' && <span>{item.sourceTier === 'discovery' ? `${item.fatalities} reported deaths` : `${item.fatalities} fatality`}</span>}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="drawer-foot">
          Global indeks: {new Date(payload.updatedAt).toLocaleString('tr-TR')} · Official: {officialItems.length} · Discovery: {discoveryItems.length} · NTSB stats: {ntsb.totalAccidents ? new Date(ntsb.generatedAt).toLocaleString('tr-TR') : 'ilk üretim bekleniyor'} · Fleet snapshot: {fleet.profiles.length ? new Date(fleet.updatedAt).toLocaleString('tr-TR') : 'yüklenmedi'}
        </div>
      </aside>
    </>
  )
}
