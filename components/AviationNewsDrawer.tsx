'use client'

import { useEffect, useMemo, useState } from 'react'

type NewsItem = { title: string; source: string; category: string; publishedAt?: string; url: string; summary?: string }
type NewsPayload = { updatedAt: string; items: NewsItem[] }

const FALLBACK: NewsPayload = {
  updatedAt: '2026-08-16T16:20:00Z',
  items: [
    { title: 'NASA Aeronautics technical updates', source: 'NASA Aeronautics', category: 'New Concepts', publishedAt: '2026-08-16T00:00:00Z', url: 'https://www.nasa.gov/aeronautics/', summary: 'Aeronautics research, flight demonstrators, structures and propulsion updates.' },
    { title: 'Aviation Week manufacturing and supply-chain coverage', source: 'Aviation Week', category: 'Manufacturing', publishedAt: '2026-07-29T00:00:00Z', url: 'https://aviationweek.com/aerospace/manufacturing-supply-chain', summary: 'Aircraft production, supply chain, industrial technology and MRO coverage.' },
    { title: 'FlightGlobal aerospace technology updates', source: 'FlightGlobal', category: 'Industry', publishedAt: '2026-03-24T16:26:00Z', url: 'https://www.flightglobal.com/news/aerospace', summary: 'Airframer, engine, MRO, programme and emerging-technology coverage.' },
  ],
}

const FILTERS = ['All', 'New Concepts', 'Structures', 'Manufacturing', 'Materials', 'Propulsion', 'MRO', 'Sustainability', 'Industry']

function relativeAge(value?: string) {
  if (!value) return 'Yayın tarihi alınamadı'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Yayın tarihi alınamadı'
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} dk önce`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} gün önce`
  if (seconds < 86400 * 365) return `${Math.floor(seconds / (86400 * 30))} ay önce`
  return `${Math.floor(seconds / (86400 * 365))} yıl önce`
}

function absoluteDate(value?: string) {
  if (!value) return 'Tarih yok'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tarih yok'
  return date.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

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

  const items = useMemo(() => {
    const filtered = filter === 'All' ? payload.items : payload.items.filter((x) => x.category === filter)
    return [...filtered].sort((a, b) => {
      const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return bt - at
    })
  }, [payload, filter])

  return (
    <>
      <button className="side-tool news-tool" onClick={() => setOpen(true)}>Havacılıkta Neler Oluyor?</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open' : 'info-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">GLOBAL AEROSPACE WATCH</div>
            <h2>Havacılıkta Neler Oluyor?</h2>
            <p>Teknik ağırlıklı haber akışı · 3 saatte bir kaynak taraması</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="news-refresh-line">
          <span>Son tarama</span>
          <strong>{new Date(payload.updatedAt).toLocaleString('tr-TR')}</strong>
        </div>
        <div className="drawer-filters">{FILTERS.map((x) => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x}</button>)}</div>
        <div className="news-list">
          {items.map((item, i) => <article className="news-card" key={`${item.source}-${item.title}-${i}`}>
            <div className="news-meta"><span>{item.category}</span><span>{item.source}</span></div>
            <div className="news-date-line">
              <strong>{absoluteDate(item.publishedAt)}</strong>
              <span>{relativeAge(item.publishedAt)}</span>
            </div>
            <h3>{item.title}</h3>
            {item.summary && <p>{item.summary}</p>}
            <a href={item.url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a>
          </article>)}
        </div>
        <div className="drawer-foot">Karttaki tarih haberin yayın tarihidir; “son tarama” ise sitemizin kaynağı en son ne zaman kontrol ettiğini gösterir.</div>
      </aside>
    </>
  )
}
