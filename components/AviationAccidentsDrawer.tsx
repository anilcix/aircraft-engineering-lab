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
}

type FleetProfile = {
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
  ageNote?: string
  fleetProfiles?: FleetProfile[]
  items: Accident[]
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
}

type NtsbPayload = {
  generatedAt: string
  coverageNote: string
  totalAccidents: number
  totalAircraftRecords?: number
  types: NtsbTypeStat[]
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
  coverageNote: 'Curated global airline safety index. This is not a complete global census.',
  items: [],
  fleetProfiles: [],
}

const NTSB_FALLBACK: NtsbPayload = {
  generatedAt: '1970-01-01T00:00:00Z',
  coverageNote: 'NTSB bulk statistics have not been generated yet.',
  totalAccidents: 0,
  types: [],
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

export default function AviationAccidentsDrawer() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<AccidentPayload>(FALLBACK)
  const [ntsb, setNtsb] = useState<NtsbPayload>(NTSB_FALLBACK)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('All')
  const [selected, setSelected] = useState<Accident | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null)
  const [mode, setMode] = useState<'dashboard' | 'cases'>('dashboard')
  const [scope, setScope] = useState<'global' | 'ntsb'>('global')

  useEffect(() => {
    fetch('./aviation-accidents.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: AccidentPayload) => setPayload(data))
      .catch(() => undefined)

    fetch('./ntsb-accident-stats.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: NtsbPayload) => setNtsb(data))
      .catch(() => undefined)
  }, [])

  const profiles = useMemo(() => new Map((payload.fleetProfiles || []).map((x) => [x.family, x])), [payload])
  const curatedFamilies = useMemo(() => familySummaries(payload.items), [payload])

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

  const totalFatalities = useMemo(() => payload.items.reduce((sum, x) => sum + (x.fatalities || 0), 0), [payload])
  const fatalCases = useMemo(() => payload.items.filter((x) => (x.fatalities || 0) > 0).length, [payload])
  const allAges = useMemo(() => payload.items.map((x) => x.aircraftAgeYears).filter((x): x is number => typeof x === 'number'), [payload])
  const avgGlobalAge = average(allAges)

  const dashboardRows = useMemo(() => {
    if (scope === 'ntsb' && ntsb.types.length) return ntsb.types.slice(0, 30)
    return curatedFamilies.map((x) => ({ ...x, make: '', model: '' }))
  }, [scope, ntsb, curatedFamilies])

  const maxCount = Math.max(1, ...dashboardRows.map((x) => x.accidents))
  const activeFamily = selectedFamily
    ? dashboardRows.find((x) => x.family === selectedFamily) || curatedFamilies.find((x) => x.family === selectedFamily)
    : null
  const activeProfile = selectedFamily ? profiles.get(selectedFamily) : undefined
  const activeCases = selectedFamily ? payload.items.filter((x) => (x.family || x.aircraft) === selectedFamily) : []
  const activeNtsb = selectedFamily ? ntsb.types.find((x) => x.family === selectedFamily) : undefined

  const documentarySearch = (item: Accident) => item.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} aviation accident documentary analysis`)}`

  return (
    <>
      <button className="side-tool accident-tool" onClick={() => setOpen(true)}>Uçak Kazaları</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open accidents-drawer safety-dashboard-drawer' : 'info-drawer accidents-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">AVIATION SAFETY INTELLIGENCE</div>
            <h2>Uçak Kazaları Dashboard</h2>
            <p>Tarihsel olaylar · tip istatistiği · uçak yaşı · güncel fleet snapshot</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="safety-mode-tabs">
          <button className={mode === 'dashboard' ? 'active' : ''} onClick={() => { setMode('dashboard'); setSelected(null) }}>Dashboard</button>
          <button className={mode === 'cases' ? 'active' : ''} onClick={() => { setMode('cases'); setSelectedFamily(null) }}>Olay Kütüphanesi</button>
        </div>

        {mode === 'dashboard' && !selectedFamily && (
          <>
            <div className="accident-coverage">{scope === 'global' ? payload.coverageNote : ntsb.coverageNote}</div>
            <div className="scope-switch">
              <button className={scope === 'global' ? 'active' : ''} onClick={() => setScope('global')}>Global detay indeksi</button>
              <button className={scope === 'ntsb' ? 'active' : ''} onClick={() => setScope('ntsb')}>NTSB bulk</button>
            </div>

            <div className="safety-kpis">
              <div><small>{scope === 'ntsb' ? 'NTSB accident records' : 'Indexed cases'}</small><strong>{scope === 'ntsb' && ntsb.totalAccidents ? ntsb.totalAccidents.toLocaleString('tr-TR') : payload.items.length}</strong></div>
              <div><small>Fatal cases</small><strong>{scope === 'global' ? fatalCases : '—'}</strong></div>
              <div><small>Fatalities</small><strong>{scope === 'global' ? totalFatalities.toLocaleString('tr-TR') : '—'}</strong></div>
              <div><small>Avg aircraft age</small><strong>{scope === 'global' ? ageText(avgGlobalAge) : 'Type bazında'}</strong></div>
            </div>

            {scope === 'ntsb' && !ntsb.types.length && (
              <div className="dashboard-empty">
                NTSB bulk istatistik dosyası ilk veri işleme çalışmasında üretilecek. Bu alan binlerce resmî NTSB kaydından otomatik dolacak.
              </div>
            )}

            <div className="type-ranking">
              <div className="dashboard-section-title"><span>Aircraft type ranking</span><small>{scope === 'ntsb' ? 'NTSB kapsamı' : 'Sitedeki global detay indeksi'}</small></div>
              {dashboardRows.map((row) => {
                const profile = profiles.get(row.family)
                return (
                  <button className="type-row" key={`${scope}-${row.family}`} onClick={() => setSelectedFamily(row.family)}>
                    <div className="type-row-main">
                      <strong>{row.family}</strong>
                      <span>{row.accidents} olay · {row.fatalAccidents} fatal · {row.fatalities.toLocaleString('tr-TR')} ölüm</span>
                    </div>
                    <div className="type-bar"><span style={{ width: `${Math.max(4, (row.accidents / maxCount) * 100)}%` }} /></div>
                    <div className="type-row-age"><small>Ort. yaş</small><strong>{ageText(row.avgAgeYears)}</strong></div>
                    <div className="type-row-service"><small>Bugün</small><strong>{profile?.status || 'Fleet snapshot yok'}</strong></div>
                  </button>
                )
              })}
            </div>

            <div className="dashboard-note">{payload.ageNote}</div>
          </>
        )}

        {mode === 'dashboard' && selectedFamily && (
          <div className="type-detail-dashboard">
            <button className="back-link" onClick={() => setSelectedFamily(null)}>← Tip sıralamasına dön</button>
            <div className="eyebrow">AIRCRAFT TYPE PROFILE</div>
            <h3>{selectedFamily}</h3>

            <div className="safety-kpis compact">
              <div><small>Global indexed cases</small><strong>{activeCases.length}</strong></div>
              <div><small>NTSB accidents</small><strong>{activeNtsb?.accidents ?? '—'}</strong></div>
              <div><small>Avg accident age</small><strong>{ageText(activeNtsb?.avgAgeYears ?? activeFamily?.avgAgeYears)}</strong></div>
              <div><small>Age range</small><strong>{activeNtsb?.minAgeYears != null && activeNtsb?.maxAgeYears != null ? `${activeNtsb.minAgeYears.toFixed(0)}–${activeNtsb.maxAgeYears.toFixed(0)} y` : activeFamily?.minAgeYears != null && activeFamily?.maxAgeYears != null ? `${activeFamily.minAgeYears.toFixed(0)}–${activeFamily.maxAgeYears.toFixed(0)} y` : '—'}</strong></div>
            </div>

            <section className="fleet-snapshot">
              <div className="dashboard-section-title"><span>Current fleet snapshot</span><small>{activeProfile ? `Kontrol: ${activeProfile.checkedAt}` : 'Henüz yok'}</small></div>
              {activeProfile ? (
                <>
                  <strong className="fleet-status">{activeProfile.status}</strong>
                  {activeProfile.currentOperators.length > 0 ? (
                    <div className="operator-chips">{activeProfile.currentOperators.map((x) => <span key={x}>{x}</span>)}</div>
                  ) : <p>Bu profil için aktif scheduled-airline operatörü listelenmiyor.</p>}
                  {activeProfile.note && <p>{activeProfile.note}</p>}
                  {activeProfile.sourceUrl && <a href={activeProfile.sourceUrl} target="_blank" rel="noreferrer">Fleet kaynağını aç ↗</a>}
                </>
              ) : <p>Bu uçak tipi için güncel operatör snapshot’ı henüz eklenmedi.</p>}
            </section>

            {activeNtsb?.sampleOperators?.length ? (
              <section>
                <h4>NTSB kayıtlarında görülen operator örnekleri</h4>
                <div className="operator-chips">{activeNtsb.sampleOperators.map((x) => <span key={x}>{x}</span>)}</div>
              </section>
            ) : null}

            <section>
              <h4>Detaylı indeksimizdeki olaylar</h4>
              {activeCases.length ? activeCases.map((item) => (
                <button className="accident-mini-row" key={item.id} onClick={() => { setSelected(item); setMode('cases') }}>
                  <span>{item.date}</span><strong>{item.title}</strong><small>{item.aircraftAgeYears != null ? `~${item.aircraftAgeYears.toFixed(1)} yaş` : 'yaş yok'}</small>
                </button>
              )) : <p>Bu tip için henüz detaylı global vaka kartı eklenmedi.</p>}
            </section>
          </div>
        )}

        {mode === 'cases' && selected ? (
          <div className="accident-detail">
            <button className="back-link" onClick={() => setSelected(null)}>← Listeye dön</button>
            <div className="news-meta"><span>{selected.date}</span><span>{selected.authority}</span><span>{selected.status}</span></div>
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
            <section><h4>Olay özeti</h4><p>{selected.summary}</p></section>
            {selected.probableCause && <section><h4>Probable cause / bulgular</h4><p>{selected.probableCause}</p></section>}
            <div className="accident-links">
              {selected.reportUrl && <a href={selected.reportUrl} target="_blank" rel="noreferrer">Resmî rapor ↗</a>}
              <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Soruşturma kaynağı ↗</a>
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
                  <div className="news-meta"><span>{item.date}</span><span>{item.authority}</span>{item.aircraftAgeYears != null && <span>~{item.aircraftAgeYears.toFixed(1)} yaş</span>}</div>
                  <h3>{item.title}</h3>
                  <p>{[item.aircraft, item.operator, item.location].filter(Boolean).join(' · ')}</p>
                  <div className="accident-card-foot"><span>{item.status}</span>{typeof item.fatalities === 'number' && <span>{item.fatalities} fatality</span>}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="drawer-foot">
          Global indeks: {new Date(payload.updatedAt).toLocaleString('tr-TR')} · NTSB stats: {ntsb.totalAccidents ? new Date(ntsb.generatedAt).toLocaleString('tr-TR') : 'ilk üretim bekleniyor'}
        </div>
      </aside>
    </>
  )
}
