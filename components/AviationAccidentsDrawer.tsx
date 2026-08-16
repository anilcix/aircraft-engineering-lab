'use client'

import { useEffect, useMemo, useState } from 'react'

type Accident = {
  id: string
  date: string
  title: string
  operator?: string
  aircraft?: string
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

type AccidentPayload = {
  updatedAt: string
  coverageNote: string
  items: Accident[]
}

const FALLBACK: AccidentPayload = {
  updatedAt: '2026-08-16T16:20:00Z',
  coverageNote: 'Seed index. NTSB bulk 1962-present and additional official investigation authorities will be federated progressively.',
  items: [],
}

export default function AviationAccidentsDrawer() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<AccidentPayload>(FALLBACK)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('All')
  const [selected, setSelected] = useState<Accident | null>(null)

  useEffect(() => {
    fetch('./aviation-accidents.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: AccidentPayload) => setPayload(data))
      .catch(() => undefined)
  }, [])

  const years = useMemo(() => {
    const values = Array.from(new Set(payload.items.map((x) => x.date.slice(0, 4)))).sort((a, b) => Number(b) - Number(a))
    return ['All', ...values]
  }, [payload])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payload.items.filter((item) => {
      const matchesYear = year === 'All' || item.date.startsWith(year)
      const haystack = `${item.title} ${item.operator ?? ''} ${item.aircraft ?? ''} ${item.location ?? ''} ${item.authority} ${item.summary}`.toLowerCase()
      return matchesYear && (!q || haystack.includes(q))
    })
  }, [payload, query, year])

  const documentarySearch = (item: Accident) => item.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} aviation accident documentary analysis`)}`

  return (
    <>
      <button className="side-tool accident-tool" onClick={() => setOpen(true)}>Uçak Kazaları</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open accidents-drawer' : 'info-drawer accidents-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">AVIATION SAFETY HISTORY</div>
            <h2>Uçak Kazaları</h2>
            <p>Tarihsel olaylar · resmî rapor ve soruşturma kaynakları</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="accident-coverage">{payload.coverageNote}</div>

        <div className="cert-controls accident-controls">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Uçuş, uçak, operatör, ülke..." />
          <select value={year} onChange={(e) => setYear(e.target.value)}>{years.map((x) => <option key={x}>{x}</option>)}</select>
        </div>

        {selected ? (
          <div className="accident-detail">
            <button className="back-link" onClick={() => setSelected(null)}>← Listeye dön</button>
            <div className="news-meta"><span>{selected.date}</span><span>{selected.authority}</span><span>{selected.status}</span></div>
            <h3>{selected.title}</h3>
            <div className="accident-grid">
              {selected.aircraft && <div><small>Aircraft</small><strong>{selected.aircraft}</strong></div>}
              {selected.operator && <div><small>Operator</small><strong>{selected.operator}</strong></div>}
              {selected.location && <div><small>Location</small><strong>{selected.location}</strong></div>}
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
        ) : (
          <div className="news-list">
            {filtered.map((item) => (
              <button className="accident-card" key={item.id} onClick={() => setSelected(item)}>
                <div className="news-meta"><span>{item.date}</span><span>{item.authority}</span></div>
                <h3>{item.title}</h3>
                <p>{[item.aircraft, item.operator, item.location].filter(Boolean).join(' · ')}</p>
                <div className="accident-card-foot"><span>{item.status}</span>{typeof item.fatalities === 'number' && <span>{item.fatalities} fatality</span>}</div>
              </button>
            ))}
          </div>
        )}
        <div className="drawer-foot">Veri indeksleme zamanı: {new Date(payload.updatedAt).toLocaleString('tr-TR')}</div>
      </aside>
    </>
  )
}
