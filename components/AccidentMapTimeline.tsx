'use client'

import { useMemo, useState } from 'react'

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

type Props = {
  items: MapAccident[]
  mapNote?: string
  onOpenCase?: (item: MapAccident) => void
}

const MIN_YEAR = 1970
const MAX_YEAR = 2026
const WIDTH = 1000
const HEIGHT = 500

const CONTINENTS: Array<Array<[number, number]>> = [
  [[-168,72],[-150,70],[-135,60],[-125,50],[-118,34],[-106,24],[-96,18],[-84,23],[-80,31],[-70,43],[-60,50],[-75,60],[-95,72],[-130,76]],
  [[-82,12],[-74,9],[-67,2],[-60,-8],[-54,-20],[-57,-35],[-67,-55],[-75,-45],[-79,-25],[-81,-5]],
  [[-24,35],[-10,44],[5,48],[20,58],[35,70],[43,60],[32,48],[20,40],[5,36]],
  [[-18,33],[-5,37],[15,34],[32,30],[45,12],[42,-10],[30,-30],[15,-35],[3,-28],[-8,-5],[-16,15]],
  [[35,72],[60,75],[90,70],[120,60],[150,55],[170,45],[155,30],[130,20],[110,5],[95,10],[80,25],[65,20],[55,32],[42,40]],
  [[110,-10],[130,-12],[150,-22],[154,-38],[138,-44],[120,-36],[112,-24]],
  [[-52,83],[-30,78],[-20,66],[-38,60],[-55,66],[-65,76]],
  [[45,-13],[51,-16],[49,-25],[44,-24]],
  [[166,-34],[178,-37],[174,-46],[166,-44]],
]

function project(lon: number, lat: number) {
  return {
    x: ((lon + 180) / 360) * WIDTH,
    y: ((90 - lat) / 180) * HEIGHT,
  }
}

function polygonPoints(points: Array<[number, number]>) {
  return points.map(([lon, lat]) => {
    const p = project(lon, lat)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')
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

function sourceLabel(item: MapAccident) {
  return item.sourceTier === 'discovery' ? 'DISCOVERY' : 'OFFICIAL'
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

  const families = useMemo(() => {
    const values = new Set(mapped.map((item) => item.family || item.aircraft).filter((x): x is string => Boolean(x)))
    return ['All', ...[...values].sort((a, b) => a.localeCompare(b))]
  }, [mapped])

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
  const visible = useMemo(() => nonYearFiltered.filter((item) => {
    const y = eventYear(item)
    return y >= startYear && y <= focusYear
  }), [nonYearFiltered, startYear, focusYear])

  const timeline = useMemo(() => {
    const counts = new Map<number, number>()
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 1) counts.set(y, 0)
    nonYearFiltered.forEach((item) => {
      const y = eventYear(item)
      counts.set(y, (counts.get(y) || 0) + 1)
    })
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
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} style={{ background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}>
            <option value="all">Official + Discovery</option>
            <option value="official">Sadece Official</option>
            <option value="discovery">Sadece Discovery</option>
          </select>
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={{ minWidth: 190, background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}>
            {families.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }}>
            {regions.map((x) => <option key={x}>{x}</option>)}
          </select>
          <input value={operatorQuery} onChange={(e) => setOperatorQuery(e.target.value)} placeholder="Havayolu ara..." style={{ flex: '1 1 150px', minWidth: 140, background: '#08121a', color: '#d8e5ed', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a9bac6', fontSize: 11 }}><input type="checkbox" checked={fatalOnly} onChange={(e) => setFatalOnly(e.target.checked)} /> Fatal only</label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 12, alignItems: 'stretch' }}>
        <div style={{ ...panel, overflow: 'hidden', position: 'relative', minHeight: 420 }}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Global aviation accident map" style={{ width: '100%', height: '100%', minHeight: 420, display: 'block', background: 'radial-gradient(circle at 50% 48%, #102636 0, #07111a 70%)' }}>
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />
            {[-120,-60,0,60,120].map((lon) => { const p = project(lon, 0); return <line key={`lon-${lon}`} x1={p.x} x2={p.x} y1={0} y2={HEIGHT} stroke="#183247" strokeWidth="1" opacity=".45" /> })}
            {[-60,-30,0,30,60].map((lat) => { const p = project(0, lat); return <line key={`lat-${lat}`} y1={p.y} y2={p.y} x1={0} x2={WIDTH} stroke="#183247" strokeWidth="1" opacity=".45" /> })}
            {CONTINENTS.map((points, index) => <polygon key={index} points={polygonPoints(points)} fill="#18313e" stroke="#315165" strokeWidth="1.5" opacity=".94" />)}
            {visible.map((item) => {
              const p = project(item.longitude!, item.latitude!)
              const fatal = (item.fatalities || 0) > 0
              const discovery = item.sourceTier === 'discovery'
              const active = selected?.id === item.id
              return (
                <g key={item.id} onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>
                  {active && <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="#f8fafc" strokeWidth="2" opacity=".9" />}
                  <circle cx={p.x} cy={p.y} r={active ? 7 : fatal ? 5.4 : 4.2} fill={discovery ? '#f59e0b' : fatal ? '#fb7185' : '#38bdf8'} stroke="#041019" strokeWidth="1.2" opacity={discovery ? .72 : .9}>
                    <title>{`${item.date} · ${item.title} · ${item.location || ''}`}</title>
                  </circle>
                </g>
              )
            })}
          </svg>
          <div style={{ position: 'absolute', left: 12, bottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', padding: '6px 8px', borderRadius: 8, background: 'rgba(4,12,18,.82)', fontSize: 9, color: '#aab9c3' }}>
            <span>● Official non-fatal</span><span style={{ color: '#fb7185' }}>● Official fatal</span><span style={{ color: '#f59e0b' }}>● Discovery</span>
          </div>
        </div>

        <div style={{ ...panel, padding: 14, minHeight: 420 }}>
          {selected ? (
            <>
              <div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sourceLabel(selected)} · {selected.date}</div>
              <h3 style={{ margin: '7px 0 8px', fontSize: 18, lineHeight: 1.25 }}>{selected.title}</h3>
              <div style={{ display: 'grid', gap: 6, fontSize: 11, color: '#a7b8c4' }}>
                {selected.aircraft && <div><b>Aircraft:</b> {selected.aircraft}</div>}
                {selected.family && <div><b>Family:</b> {selected.family}</div>}
                {selected.operator && <div><b>Operator:</b> {selected.operator}</div>}
                {selected.location && <div><b>Location:</b> {selected.location}</div>}
                <div><b>Region:</b> {regionFor(selected.latitude!, selected.longitude!)}</div>
                {typeof selected.fatalities === 'number' && <div><b>Fatalities:</b> {selected.fatalities}</div>}
              </div>
              <p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>{selected.summary}</p>
              <div style={{ borderTop: '1px solid #223747', paddingTop: 9, marginTop: 10, ...small }}>{selected.coordinateSource || 'Structured coordinate'}</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Kaynak ↗</a>
                {selected.reportUrl && <a href={selected.reportUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Rapor ↗</a>}
                {onOpenCase && <button onClick={() => onOpenCase(selected)} style={{ border: '1px solid #2a4b61', borderRadius: 7, background: '#102333', color: '#d7e6ee', padding: '6px 8px', cursor: 'pointer', fontSize: 10 }}>Tam olay kartı</button>}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>MAP SELECTION</div>
              <h3 style={{ margin: '7px 0 8px', fontSize: 18 }}>Bir pine tıkla</h3>
              <p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.55 }}>Seçtiğin olayın uçak tipi, operatörü, bölgesi, ölüm bilgisi ve kaynak bağlantıları burada açılır.</p>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        <div style={{ ...panel, padding: 10 }}><small style={small}>GÖRÜNEN OLAY</small><strong style={{ display: 'block', marginTop: 5, fontSize: 18 }}>{visible.length}</strong></div>
        <div style={{ ...panel, padding: 10 }}><small style={small}>FATAL OLAY</small><strong style={{ display: 'block', marginTop: 5, fontSize: 18 }}>{fatalEvents}</strong></div>
        <div style={{ ...panel, padding: 10 }}><small style={small}>OFFICIAL FATALITIES</small><strong style={{ display: 'block', marginTop: 5, fontSize: 18 }}>{officialFatalities.toLocaleString('tr-TR')}</strong></div>
        <div style={{ ...panel, padding: 10 }}><small style={small}>YOĞUNLUK</small><strong style={{ display: 'block', marginTop: 5, fontSize: 12 }}>{topFamily} · {topRegion}</strong></div>
      </div>

      <div style={{ ...panel, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 10 }}>
          <div><strong style={{ fontSize: 13 }}>Zaman çizelgesi</strong><div style={small}>{startYear}–{focusYear} gösteriliyor · slider 1970→2026</div></div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[1,5,10,20].map((w) => <button key={w} onClick={() => setWindowYears(w)} style={{ border: `1px solid ${windowYears === w ? '#38bdf8' : '#26394a'}`, borderRadius: 999, background: windowYears === w ? '#123044' : '#091721', color: '#bdd0dc', padding: '5px 8px', cursor: 'pointer', fontSize: 9 }}>{w} yıl</button>)}
          </div>
        </div>
        <div style={{ height: 72, display: 'grid', gridTemplateColumns: `repeat(${timeline.length}, minmax(2px, 1fr))`, gap: 1, alignItems: 'end', padding: '0 2px', borderBottom: '1px solid #294052' }}>
          {timeline.map((row) => {
            const active = row.year >= startYear && row.year <= focusYear
            return <div key={row.year} title={`${row.year}: ${row.count} mapped events`} onClick={() => setFocusYear(row.year)} style={{ height: `${Math.max(2, (row.count / maxTimeline) * 68)}px`, background: active ? '#38bdf8' : '#203848', opacity: active ? .9 : .48, cursor: 'pointer', borderRadius: '2px 2px 0 0' }} />
          })}
        </div>
        <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={focusYear} onChange={(e) => setFocusYear(Number(e.target.value))} style={{ width: '100%', marginTop: 10 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...small }}><span>1970</span><strong style={{ color: '#dce8ef' }}>{focusYear}</strong><span>2026</span></div>
      </div>

      <div style={{ color: '#738796', fontSize: 10, lineHeight: 1.5 }}>
        {mapNote || `${mapped.length} kayıt koordinat içeriyor.`} Harita koordinatı olmayan olayları gizler; onlar Olay Kütüphanesi'nde kalır. Discovery pinleri kapsam keşfidir ve resmî doğrulama yerine geçmez.
      </div>
    </div>
  )
}
