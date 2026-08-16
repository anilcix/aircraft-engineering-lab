'use client'

import { useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import countries110m from 'world-atlas/countries-110m.json'

export type MapAccident = {
  id: string
  date: string
  title: string
  operator?: string
  aircraft?: string
  family?: string
  location?: string
  fatalities?: number
  authority: string
  status: string
  summary: string
  sourceUrl: string
  reportUrl?: string
  sourceTier?: 'official' | 'discovery'
  latitude?: number
  longitude?: number
  coordinateSource?: string
}

type Props = { items: MapAccident[]; mapNote?: string; onOpenCase?: (item: MapAccident) => void }
type GeoGeometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
type GeoFeature = { id?: string | number; geometry: GeoGeometry }

const MIN_YEAR = 1970
const MAX_YEAR = 2026
const WIDTH = 1000
const HEIGHT = 500

const WORLD_FEATURES = ((feature(countries110m as never, (countries110m as { objects: { countries: unknown } }).objects.countries as never) as unknown) as { features: GeoFeature[] }).features

function project(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * WIDTH, y: ((90 - lat) / 180) * HEIGHT }
}

function ringPath(ring: number[][]) {
  return ring.map(([lon, lat], index) => {
    const p = project(lon, lat)
    return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ') + ' Z'
}

function geometryPath(geometry: GeoGeometry) {
  if (geometry.type === 'Polygon') return (geometry.coordinates as number[][][]).map(ringPath).join(' ')
  return (geometry.coordinates as number[][][][]).map((polygon) => polygon.map(ringPath).join(' ')).join(' ')
}

function hasCoords(item: MapAccident) {
  return typeof item.latitude === 'number' && Number.isFinite(item.latitude) && typeof item.longitude === 'number' && Number.isFinite(item.longitude)
}

function eventYear(item: MapAccident) {
  const y = Number(item.date?.slice(0, 4))
  return Number.isFinite(y) ? y : 0
}

function regionFor(lat: number, lon: number) {
  if (lat >= 12 && lat <= 43 && lon >= 25 && lon <= 65) return 'Middle East'
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return 'Europe'
  if (lat >= 15 && lon < -50) return 'North America'
  if (lat < 15 && lat > -60 && lon >= -90 && lon < -30) return 'South America'
  if (lat < 35 && lat >= -40 && lon >= -20 && lon <= 55) return 'Africa'
  if (lat < 5 && lon >= 95) return 'Oceania'
  if (lon > 45 && lon <= 180 && lat >= -10) return 'Asia'
  return 'Other / Oceanic'
}

function topValue(values: string[]) {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
}

export default function AccidentMapTimeline({ items, mapNote, onOpenCase }: Props) {
  const [focusYear, setFocusYear] = useState(MAX_YEAR)
  const [windowYears, setWindowYears] = useState(5)
  const [source, setSource] = useState<'all' | 'official' | 'discovery'>('all')
  const [family, setFamily] = useState('All')
  const [region, setRegion] = useState('All')
  const [operatorQuery, setOperatorQuery] = useState('')
  const [fatalOnly, setFatalOnly] = useState(false)
  const [selected, setSelected] = useState<MapAccident | null>(null)

  const mapped = useMemo(() => items.filter((item) => hasCoords(item) && eventYear(item) >= MIN_YEAR && eventYear(item) <= MAX_YEAR), [items])
  const families = useMemo(() => ['All', ...[...new Set(mapped.map((item) => item.family || item.aircraft).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b))], [mapped])
  const regions = ['All', 'North America', 'South America', 'Europe', 'Africa', 'Middle East', 'Asia', 'Oceania', 'Other / Oceanic']

  const nonYearFiltered = useMemo(() => {
    const q = operatorQuery.trim().toLowerCase()
    return mapped.filter((item) => {
      if (source === 'official' && item.sourceTier === 'discovery') return false
      if (source === 'discovery' && item.sourceTier !== 'discovery') return false
      if (family !== 'All' && (item.family || item.aircraft || '') !== family) return false
      if (region !== 'All' && regionFor(item.latitude!, item.longitude!) !== region) return false
      if (fatalOnly && (item.fatalities || 0) <= 0) return false
      if (q && !(item.operator || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [mapped, source, family, region, fatalOnly, operatorQuery])

  const startYear = Math.max(MIN_YEAR, focusYear - windowYears + 1)
  const visible = useMemo(() => nonYearFiltered.filter((item) => eventYear(item) >= startYear && eventYear(item) <= focusYear), [nonYearFiltered, startYear, focusYear])
  const timeline = useMemo(() => {
    const counts = new Map<number, number>()
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 1) counts.set(y, 0)
    nonYearFiltered.forEach((item) => counts.set(eventYear(item), (counts.get(eventYear(item)) || 0) + 1))
    return [...counts.entries()].map(([year, count]) => ({ year, count }))
  }, [nonYearFiltered])

  const maxTimeline = Math.max(1, ...timeline.map((x) => x.count))
  const officialFatalities = visible.filter((x) => x.sourceTier !== 'discovery').reduce((sum, x) => sum + (x.fatalities || 0), 0)
  const fatalEvents = visible.filter((x) => (x.fatalities || 0) > 0).length
  const topFamily = topValue(visible.map((x) => x.family || x.aircraft || ''))
  const topRegion = topValue(visible.map((x) => regionFor(x.latitude!, x.longitude!)))
  const panel: React.CSSProperties = { border: '1px solid #24394b', borderRadius: 12, background: '#0a1620' }
  const small: React.CSSProperties = { color: '#7890a2', fontSize: 10 }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ ...panel, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} style={{ background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}><option value="all">Official + Discovery</option><option value="official">Sadece Official</option><option value="discovery">Sadece Discovery</option></select>
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={{ minWidth: 190, background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}>{families.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}>{regions.map((x) => <option key={x}>{x}</option>)}</select>
          <input value={operatorQuery} onChange={(e) => setOperatorQuery(e.target.value)} placeholder="Havayolu ara..." style={{ flex: '1 1 150px', minWidth: 140, background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a9bac6', fontSize: 11 }}><input type="checkbox" checked={fatalOnly} onChange={(e) => setFatalOnly(e.target.checked)} /> Fatal only</label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 12, alignItems: 'stretch' }}>
        <div style={{ ...panel, overflow: 'hidden', position: 'relative', minHeight: 420 }}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Natural Earth global aviation accident map" style={{ width: '100%', height: '100%', minHeight: 420, display: 'block', background: 'radial-gradient(circle at 50% 48%, #102636 0, #07111a 70%)' }}>
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />
            {[-120,-60,0,60,120].map((lon) => { const p = project(lon, 0); return <line key={`lon-${lon}`} x1={p.x} x2={p.x} y1={0} y2={HEIGHT} stroke="#183247" strokeWidth="1" opacity=".35" /> })}
            {[-60,-30,0,30,60].map((lat) => { const p = project(0, lat); return <line key={`lat-${lat}`} y1={p.y} y2={p.y} x1={0} x2={WIDTH} stroke="#183247" strokeWidth="1" opacity=".35" /> })}
            {WORLD_FEATURES.map((country, index) => <path key={String(country.id ?? index)} d={geometryPath(country.geometry)} fill="#17313e" stroke="#426176" strokeWidth="0.65" opacity=".96" fillRule="evenodd" />)}
            {visible.map((item) => {
              const p = project(item.longitude!, item.latitude!)
              const fatal = (item.fatalities || 0) > 0
              const discovery = item.sourceTier === 'discovery'
              const active = selected?.id === item.id
              return <g key={item.id} onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>{active && <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="#f8fafc" strokeWidth="2" />}<circle cx={p.x} cy={p.y} r={active ? 7 : fatal ? 5.2 : 4} fill={discovery ? '#f59e0b' : fatal ? '#fb7185' : '#38bdf8'} stroke="#041019" strokeWidth="1.1" opacity={discovery ? .72 : .92}><title>{`${item.date} · ${item.title} · ${item.location || ''}`}</title></circle></g>
            })}
          </svg>
          <div style={{ position: 'absolute', left: 12, bottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', padding: '6px 8px', borderRadius: 8, background: 'rgba(4,12,18,.84)', fontSize: 9, color: '#aab9c3' }}><span style={{ color: '#38bdf8' }}>● Official non-fatal</span><span style={{ color: '#fb7185' }}>● Official fatal</span><span style={{ color: '#f59e0b' }}>● Discovery</span><span>Natural Earth 1:110m basemap</span></div>
        </div>

        <div style={{ ...panel, padding: 14, minHeight: 420 }}>
          {selected ? <><div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>{selected.sourceTier === 'discovery' ? 'DISCOVERY' : 'OFFICIAL'} · {selected.date}</div><h3 style={{ margin: '7px 0 8px', fontSize: 18, lineHeight: 1.25 }}>{selected.title}</h3><div style={{ display: 'grid', gap: 6, fontSize: 11, color: '#a7b8c4' }}>{selected.aircraft && <div><b>Aircraft:</b> {selected.aircraft}</div>}{selected.family && <div><b>Family:</b> {selected.family}</div>}{selected.operator && <div><b>Operator:</b> {selected.operator}</div>}{selected.location && <div><b>Location:</b> {selected.location}</div>}<div><b>Region:</b> {regionFor(selected.latitude!, selected.longitude!)}</div>{typeof selected.fatalities === 'number' && <div><b>Fatalities:</b> {selected.fatalities}</div>}</div><p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>{selected.summary}</p><div style={{ borderTop: '1px solid #223747', paddingTop: 9, marginTop: 10, ...small }}>{selected.coordinateSource || 'Structured coordinate'}</div><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}><a href={selected.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Kaynak ↗</a>{selected.reportUrl && <a href={selected.reportUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Rapor ↗</a>}{onOpenCase && <button onClick={() => onOpenCase(selected)} style={{ border: '1px solid #2a4b61', borderRadius: 7, background: '#102333', color: '#d7e6ee', padding: '6px 8px', cursor: 'pointer', fontSize: 10 }}>Tam olay kartı</button>}</div></> : <><div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>MAP SELECTION</div><h3 style={{ margin: '7px 0 8px', fontSize: 18 }}>Bir pine tıkla</h3><p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.55 }}>Seçilen olayın uçak tipi, operatörü, konumu, ölüm bilgisi ve kaynak bağlantıları burada görünür.</p></>}
        </div>
      </div>

      <div style={{ ...panel, padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
          <div><small style={small}>GÖRÜNEN OLAY</small><strong style={{ display: 'block', fontSize: 18 }}>{visible.length}</strong></div><div><small style={small}>FATAL OLAY</small><strong style={{ display: 'block', fontSize: 18 }}>{fatalEvents}</strong></div><div><small style={small}>OFFICIAL FATALITIES</small><strong style={{ display: 'block', fontSize: 18 }}>{officialFatalities.toLocaleString('tr-TR')}</strong></div><div><small style={small}>TOP TYPE</small><strong style={{ display: 'block', fontSize: 12 }}>{topFamily}</strong></div><div><small style={small}>TOP REGION</small><strong style={{ display: 'block', fontSize: 12 }}>{topRegion}</strong></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', height: 82, gap: 2, borderBottom: '1px solid #294051', paddingBottom: 2 }}>{timeline.map((row) => <button key={row.year} title={`${row.year}: ${row.count}`} onClick={() => setFocusYear(row.year)} style={{ flex: 1, height: `${Math.max(2, (row.count / maxTimeline) * 72)}px`, minWidth: 2, padding: 0, border: 0, background: row.year >= startYear && row.year <= focusYear ? '#38bdf8' : '#29475a', opacity: row.year >= startYear && row.year <= focusYear ? .9 : .55, cursor: 'pointer' }} />)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...small, marginTop: 4 }}><span>{MIN_YEAR}</span><strong style={{ color: '#b8cad5' }}>{startYear}–{focusYear}</strong><span>{MAX_YEAR}</span></div>
        <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={focusYear} onChange={(e) => setFocusYear(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{[1,5,10,20].map((n) => <button key={n} onClick={() => setWindowYears(n)} style={{ border: windowYears === n ? '1px solid #38bdf8' : '1px solid #284154', borderRadius: 7, background: windowYears === n ? '#102a39' : '#09151e', color: '#c8d6df', padding: '6px 8px', cursor: 'pointer', fontSize: 10 }}>{n} yıl</button>)}</div>
        <p style={{ ...small, marginTop: 10 }}>{mapNote || `${mapped.length} koordinatlı kayıt haritada kullanılabilir.`} Altlık: Natural Earth / world-atlas 1:110m.</p>
      </div>
    </div>
  )
}
