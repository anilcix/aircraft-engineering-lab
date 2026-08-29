'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUiLanguage } from '@/components/UiLanguage'

type NewsItem = { title: string; source: string; category: string; publishedAt?: string; url: string; summary?: string; summaryTr?: string }
type NewsPayload = { updatedAt: string; items: NewsItem[] }

const FALLBACK: NewsPayload = {
  updatedAt: '2026-08-16T16:20:00Z',
  items: [
    { title: 'NASA Aeronautics technical updates', source: 'NASA Aeronautics', category: 'New Concepts', publishedAt: '2026-08-16T00:00:00Z', url: 'https://www.nasa.gov/aeronautics/', summary: 'Aeronautics research, flight demonstrators, structures and propulsion updates.', summaryTr: 'NASA Aeronautics tarafındaki havacılık araştırmaları, uçuş demonstratörleri, yapılar ve itki sistemleriyle ilgili güncellemeler.' },
    { title: 'Aviation Week manufacturing and supply-chain coverage', source: 'Aviation Week', category: 'Manufacturing', publishedAt: '2026-07-29T00:00:00Z', url: 'https://aviationweek.com/aerospace/manufacturing-supply-chain', summary: 'Aircraft production, supply chain, industrial technology and MRO coverage.', summaryTr: 'Uçak üretimi, tedarik zinciri, endüstriyel teknoloji ve MRO alanındaki gelişmeler.' },
    { title: 'FlightGlobal aerospace technology updates', source: 'FlightGlobal', category: 'Industry', publishedAt: '2026-03-24T16:26:00Z', url: 'https://www.flightglobal.com/news/aerospace', summary: 'Airframer, engine, MRO, programme and emerging-technology coverage.', summaryTr: 'Uçak üreticileri, motorlar, MRO, programlar ve yeni teknolojilerle ilgili sektör gelişmeleri.' },
  ],
}

const FILTERS = ['All', 'New Concepts', 'Structures', 'Manufacturing', 'Materials', 'Propulsion', 'MRO', 'Sustainability', 'Industry']
const CATEGORY_TR: Record<string, string> = {
  'New Concepts': 'Yeni Konseptler', Structures: 'Yapılar', Manufacturing: 'Üretim', Materials: 'Malzemeler', Propulsion: 'İtki', MRO: 'MRO', Sustainability: 'Sürdürülebilirlik', Industry: 'Sektör',
}

function relativeAge(value: string | undefined, tr: boolean) {
  if (!value) return tr ? 'Yayın tarihi alınamadı' : 'Publication date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return tr ? 'Yayın tarihi alınamadı' : 'Publication date unavailable'
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 3600) return tr ? `${Math.max(1, Math.floor(seconds / 60))} dk önce` : `${Math.max(1, Math.floor(seconds / 60))} min ago`
  if (seconds < 86400) return tr ? `${Math.floor(seconds / 3600)} saat önce` : `${Math.floor(seconds / 3600)} hr ago`
  if (seconds < 86400 * 30) return tr ? `${Math.floor(seconds / 86400)} gün önce` : `${Math.floor(seconds / 86400)} days ago`
  if (seconds < 86400 * 365) return tr ? `${Math.floor(seconds / (86400 * 30))} ay önce` : `${Math.floor(seconds / (86400 * 30))} mo ago`
  return tr ? `${Math.floor(seconds / (86400 * 365))} yıl önce` : `${Math.floor(seconds / (86400 * 365))} yr ago`
}

function absoluteDate(value: string | undefined, locale: string) {
  if (!value) return locale === 'tr-TR' ? 'Tarih yok' : 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return locale === 'tr-TR' ? 'Tarih yok' : 'No date'
  return date.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function cleanSourceTitle(title: string) {
  return title
    .replace(/^\s*(article\s+)?\d+\s*min\s*read\s*/i, '')
    .replace(/\s+article\s+(?:\d+\s+(?:hours?|days?|weeks?)\s+ago|\d+\s+day\s+ago)$/i, '')
    .replace(/\s+(?:\d+\s+(?:hours?|days?|weeks?)\s+ago)$/i, '')
    .trim()
}

function canonicalNewsKey(item: NewsItem) {
  try {
    const url = new URL(item.url)
    url.hash = ''
    ;['utm_source','utm_medium','utm_campaign','utm_term','utm_content','output'].forEach((key) => url.searchParams.delete(key))
    const normalizedUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}`.toLowerCase()
    if (normalizedUrl) return `url:${normalizedUrl}`
  } catch { /* title fallback */ }
  const normalizedTitle = cleanSourceTitle(item.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return `title:${item.source.toLowerCase()}:${normalizedTitle}`
}

function dedupeNews(items: NewsItem[]) {
  const seen = new Set<string>()
  const out: NewsItem[] = []
  for (const item of items) {
    const key = canonicalNewsKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function turkishSummary(item: NewsItem) {
  if (item.summaryTr) return item.summaryTr
  const generic = !item.summary || /^Latest technical aerospace item collected from/i.test(item.summary)
  if (!generic) return `Kaynak özeti İngilizce: ${item.summary}`
  const categoryText: Record<string, string> = {
    'New Concepts': 'yeni nesil havacılık konseptleri ve teknoloji geliştirme',
    Structures: 'uçak yapıları, yük taşıyan bileşenler ve yapısal teknoloji',
    Manufacturing: 'havacılık üretimi, imalat teknolojileri ve tedarik zinciri',
    Materials: 'havacılık malzemeleri ve malzeme teknolojileri',
    Propulsion: 'motor, türbin ve itki sistemleri',
    MRO: 'bakım, onarım ve revizyon',
    Sustainability: 'sürdürülebilir havacılık ve emisyon azaltımı',
    Industry: 'havacılık sektörü, programlar ve araştırma faaliyetleri',
  }
  return `${item.source} kaynaklı bu gelişme, ${categoryText[item.category] || 'havacılık teknolojileri'} alanında yeni bir güncellemeyi ele alıyor.`
}

export default function AviationNewsDrawer() {
  const { tr } = useUiLanguage()
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<NewsPayload>(FALLBACK)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetch('./aviation-news.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: NewsPayload) => { if (Array.isArray(data.items) && data.items.length) setPayload(data) })
      .catch(() => undefined)
  }, [])

  const sortedAll = useMemo(() => dedupeNews([...payload.items].sort((a, b) => {
    const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bt - at
  })), [payload])

  const items = useMemo(() => filter === 'All' ? sortedAll : sortedAll.filter((x) => x.category === filter), [sortedAll, filter])
  const digest = sortedAll.slice(0, 4)
  const locale = tr ? 'tr-TR' : 'en-US'
  const summaryFor = (item: NewsItem) => tr ? turkishSummary(item) : item.summary

  return (
    <>
      <button className="side-tool news-tool" onClick={() => setOpen(true)}>{tr ? 'Havacılık Gündemi' : 'Aerospace Watch'}</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open' : 'info-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">GLOBAL AEROSPACE WATCH</div>
            <h2>{tr ? 'Havacılıkta Neler Oluyor?' : 'What’s Happening in Aerospace?'}</h2>
            <p>{tr ? 'Teknik ağırlıklı haber akışı · 3 saatte bir kaynak taraması' : 'Engineering-focused feed · sources scanned every 3 hours'}</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <section className="news-digest-card">
          <div className="news-digest-head"><span>{tr ? 'HIZLI ÖZET' : 'QUICK DIGEST'}</span><small>{tr ? 'Son gelişmeler' : 'Latest developments'}</small></div>
          <h3>{tr ? 'Bugün havacılıkta öne çıkanlar' : 'What matters in aerospace right now'}</h3>
          <div className="news-digest-list">
            {digest.map((item, i) => <div key={canonicalNewsKey(item)}><b>{i + 1}</b><p><strong>{cleanSourceTitle(item.title)}</strong>{summaryFor(item) ? ` — ${summaryFor(item)}` : ''}</p></div>)}
          </div>
        </section>

        <div className="news-refresh-line"><span>{tr ? 'Son tarama' : 'Last scan'}</span><strong>{new Date(payload.updatedAt).toLocaleString(locale)}</strong></div>
        <div className="drawer-filters">{FILTERS.map((x) => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x === 'All' ? (tr ? 'Tümü' : 'All') : (tr ? CATEGORY_TR[x] || x : x)}</button>)}</div>
        <div className="news-list">
          {items.map((item) => <article className="news-card" key={canonicalNewsKey(item)}>
            <div className="news-meta"><span>{tr ? CATEGORY_TR[item.category] || item.category : item.category}</span><span>{item.source}</span></div>
            <div className="news-date-line"><strong>{absoluteDate(item.publishedAt, locale)}</strong><span>{relativeAge(item.publishedAt, tr)}</span></div>
            <h3>{cleanSourceTitle(item.title)}</h3>
            {summaryFor(item) && <p>{summaryFor(item)}</p>}
            <a href={item.url} target="_blank" rel="noreferrer">{tr ? 'Kaynağı aç' : 'Open source'} ↗</a>
          </article>)}
        </div>
        <div className="drawer-foot">{tr ? 'Aynı URL veya aynı normalize başlığa sahip tekrarlar otomatik gizlenir. Haber başlığı kaynak dilinde korunur; açıklama TR modunda Türkçe özet olarak gösterilir.' : 'Duplicates with the same canonical URL or normalized title are hidden automatically. Source headlines remain in their original language.'}</div>
      </aside>
    </>
  )
}
