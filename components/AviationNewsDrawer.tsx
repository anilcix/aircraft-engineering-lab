'use client'

import { useEffect, useMemo, useState } from 'react'

type NewsItem = { title: string; source: string; category: string; publishedAt?: string; url: string; summary?: string }
type NewsPayload = { updatedAt: string; items: NewsItem[] }

const FALLBACK: NewsPayload = {
  updatedAt: '2026-08-16T16:20:00Z',
  items: [
    { title: 'NASA, GE Aerospace Work Enables Hybrid-Electric Flight Demonstration', source: 'NASA Aeronautics', category: 'Propulsion', url: 'https://www.nasa.gov/aeronautics/', summary: 'Hybrid-electric propulsion integration and flight-demonstration work.' },
    { title: 'NASA Pushes New Wing Design to Find Structural Limits', source: 'NASA Aeronautics', category: 'Structures', url: 'https://www.nasa.gov/aeronautics/', summary: 'Research focused on advanced wing structural behavior and test limits.' },
    { title: 'Aviation Week aerospace technology and program updates', source: 'Aviation Week', category: 'New Concepts', url: 'https://aviationweek.com/awn-rss/feed', summary: 'Current aerospace programs, technologies, propulsion, manufacturing and MRO coverage.' },
    { title: 'FlightGlobal aerospace and airframer technology updates', source: 'FlightGlobal', category: 'Industry', url: 'https://www.flightglobal.com/', summary: 'Current aerospace, airframer, engine, MRO and programme coverage.' },
  ],
}

const FILTERS = ['All', 'New Concepts', 'Structures', 'Manufacturing', 'Materials', 'Propulsion', 'MRO', 'Sustainability', 'Industry']

export default function AviationNewsDrawer() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<NewsPayload>(FALLBACK)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetch('./aviation-news.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: NewsPayload) => { if (Array.isArray(data.items) && data.items.length) setPayload(data) })
      .catch(() => undefined)
  }, [])

  const items = useMemo(() => filter === 'All' ? payload.items : payload.items.filter((x) => x.category === filter), [payload, filter])

  return (
    <>
      <button className="side-tool news-tool" onClick={() => setOpen(true)}>Havacılıkta Neler Oluyor?</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open' : 'info-drawer'}>
        <div className="drawer-head">
          <div><div className="eyebrow">GLOBAL AEROSPACE WATCH</div><h2>Havacılıkta Neler Oluyor?</h2><p>Teknik ağırlıklı haber akışı · 3 saatte bir yenilenir</p></div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="drawer-filters">{FILTERS.map((x) => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x}</button>)}</div>
        <div className="news-list">
          {items.map((item, i) => <article className="news-card" key={`${item.source}-${item.title}-${i}`}>
            <div className="news-meta"><span>{item.category}</span><span>{item.source}</span>{item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString('tr-TR')}</span>}</div>
            <h3>{item.title}</h3>
            {item.summary && <p>{item.summary}</p>}
            <a href={item.url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a>
          </article>)}
        </div>
        <div className="drawer-foot">Son kaynak taraması: {new Date(payload.updatedAt).toLocaleString('tr-TR')}</div>
      </aside>
    </>
  )
}
