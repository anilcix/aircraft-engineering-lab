'use client'

import { useMemo, useRef, useState } from 'react'
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
type MapView = { scale: number; x: number; y: number }

const MIN_YEAR = 1970
const MAX_YEAR = 2026
const WIDTH = 1000
const HEIGHT = 520
const MAP_PAD_X = 24
const MAP_PAD_Y = 28
const MIN_ZOOM = 1
const MAX_ZOOM = 8

const WORLD_FEATURES = ((feature(countries110m as never, (countries110m as { objects: { countries: unknown } }).objects.countries as never) as unknown) as { features: GeoFeature[] }).features

const A0 = 0.8707
const A1 = -0.131979
const A2 = -0.013791
const A3 = 0.003971
const A4 = -0.001529
const B0 = 1.007226
const B1 = 0.015085
const B2 = -0.044475
const B3 = 0.028874
const B4 = -0.005916
const RAW_X_MAX = Math.PI * A0
const RAW_Y_MAX = (() => {
  const phi = Math.PI / 2
  const phi2 = phi * phi
  const phi4 = phi2 * phi2
  return phi * (B0 + phi2 * (B1 + phi4 * (B2 + B3 * phi2 + B4 * phi4)))
})()

function naturalEarthRaw(lon: number, lat: number) {
  const lambda = lon * Math.PI / 180
  const phi = Math.max(-89.999, Math.min(89.999, lat)) * Math.PI / 180
  const phi2 = phi * phi
  const phi4 = phi2 * phi2
  const x = lambda * (A0 + phi2 * (A1 + phi2 * (A2 + phi4 * phi2 * (A3 + phi2 * A4))))
  const y = phi * (B0 + phi2 * (B1 + phi4 * (B2 + B3 * phi2 + B4 * phi4)))
  return { x, y }
}

function project(lon: number, lat: number) {
  const raw = naturalEarthRaw(lon, lat)
  const usableW = WIDTH - MAP_PAD_X * 2
  const usableH = HEIGHT - MAP_PAD_Y * 2
  const scale = Math.min(usableW / (RAW_X_MAX * 2), usableH / (RAW_Y_MAX * 2))
  return { x: WIDTH / 2 + raw.x * scale, y: HEIGHT / 2 - raw.y * scale }
}

function ringPath(ring: number[][]) {
  if (!ring.length) return ''
  let path = ''
  let previous: { x: number; y: number } | null = null
  let segmentOpen = false
  for (const [lon, lat] of ring) {
    const p = project(lon, lat)
    const crossedAntimeridian = previous && Math.abs(p.x - previous.x) > WIDTH * 0.55
    if (!segmentOpen || crossedAntimeridian) {
      if (segmentOpen) path += ' Z '
      path += `M${p.x.toFixed(2)},${p.y.toFixed(2)}`
      segmentOpen = true
    } else {
      path += ` L${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }
    previous = p
  }
  return segmentOpen ? `${path} Z` : path
}

function geometryPath(geometry: GeoGeometry) {
  if (geometry.type === 'Polygon') return (geometry.coordinates as number[][][]).map(ringPath).join(' ')
  return (geometry.coordinates as number[][][][]).map((polygon) => polygon.map(ringPath).join(' ')).join(' ')
}

function sampledPath(points: Array<[number, number]>, close = false) {
  const body = points.map(([lon, lat], index) => {
    const p = project(lon, lat)
    return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')
  return close ? `${body} Z` : body
}

function longitudeLine(lon: number) {
  const points: Array<[number, number]> = []
  for (let lat = -80; lat <= 80; lat += 4) points.push([lon, lat])
  return sampledPath(points)
}

function latitudeLine(lat: number) {
  const points: Array<[number, number]> = []
  for (let lon = -180; lon <= 180; lon += 4) points.push([lon, lat])
  return sampledPath(points)
}

function spherePath() {
  const points: Array<[number, number]> = []
  for (let lon = -180; lon <= 180; lon += 4) points.push([lon, 89.999])
  for (let lat = 86; lat >= -86; lat -= 4) points.push([180, lat])
  for (let lon = 180; lon >= -180; lon -= 4) points.push([lon, -89.999])
  for (let lat = -86; lat <= 86; lat += 4) points.push([-180, lat])
  return sampledPath(points, true)
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

function clampView(view: MapView): MapView {
  const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.scale))
  if (scale <= 1.0001) return { scale: 1, x: 0, y: 0 }
  const minX = WIDTH * (1 - scale)
  const minY = HEIGHT * (1 - scale)
  return {
    scale,
    x: Math.max(minX, Math.min(0, view.x)),
    y: Math.max(minY, Math.min(0, view.y)),
  }
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
  const [draggingYear, setDraggingYear] = useState(false)
  const [mapView, setMapView] = useState<MapView>({ scale: 1, x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null)

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
  const selectedPeriod = startYear === focusYear ? String(focusYear) : `${startYear}–${focusYear}`
  const sliderPercent = ((focusYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100

  const zoomAroundSvgPoint = (svgX: number, svgY: number, factor: number) => {
    setMapView((current) => {
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.scale * factor))
      const worldX = (svgX - current.x) / current.scale
      const worldY = (svgY - current.y) / current.scale
      return clampView({
        scale: nextScale,
        x: svgX - worldX * nextScale,
        y: svgY - worldY * nextScale,
      })
    })
  }

  const zoomCenter = (factor: number) => zoomAroundSvgPoint(WIDTH / 2, HEIGHT / 2, factor)

  const resetView = () => setMapView({ scale: 1, x: 0, y: 0 })

  const fitToResults = () => {
    if (!visible.length) return resetView()
    const points = visible.map((item) => project(item.longitude!, item.latitude!))
    if (points.length === 1) {
      const p = points[0]
      const scale = 5
      setMapView(clampView({ scale, x: WIDTH / 2 - p.x * scale, y: HEIGHT / 2 - p.y * scale }))
      return
    }
    const minX = Math.min(...points.map((p) => p.x))
    const maxX = Math.max(...points.map((p) => p.x))
    const minY = Math.min(...points.map((p) => p.y))
    const maxY = Math.max(...points.map((p) => p.y))
    const spanX = Math.max(35, maxX - minX)
    const spanY = Math.max(35, maxY - minY)
    const scale = Math.max(1, Math.min(6, Math.min((WIDTH - 150) / spanX, (HEIGHT - 120) / spanY)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setMapView(clampView({ scale, x: WIDTH / 2 - centerX * scale, y: HEIGHT / 2 - centerY * scale }))
  }

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
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Zoomable Natural Earth projected global aviation accident map"
            onWheel={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH
              const svgY = ((e.clientY - rect.top) / rect.height) * HEIGHT
              const factor = Math.max(0.72, Math.min(1.38, Math.exp(-e.deltaY * 0.0015)))
              zoomAroundSvgPoint(svgX, svgY, factor)
            }}
            onDoubleClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH
              const svgY = ((e.clientY - rect.top) / rect.height) * HEIGHT
              zoomAroundSvgPoint(svgX, svgY, 1.8)
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              dragRef.current = { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, x: mapView.x, y: mapView.y }
              setIsPanning(true)
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current
              if (!drag || drag.pointerId !== e.pointerId || mapView.scale <= 1) return
              const rect = e.currentTarget.getBoundingClientRect()
              const dx = (e.clientX - drag.clientX) * WIDTH / rect.width
              const dy = (e.clientY - drag.clientY) * HEIGHT / rect.height
              setMapView(clampView({ scale: mapView.scale, x: drag.x + dx, y: drag.y + dy }))
            }}
            onPointerUp={(e) => {
              if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
              if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
              setIsPanning(false)
            }}
            onPointerCancel={() => { dragRef.current = null; setIsPanning(false) }}
            style={{ width: '100%', height: '100%', minHeight: 420, display: 'block', background: 'radial-gradient(circle at 50% 48%, #102636 0, #07111a 70%)', cursor: isPanning ? 'grabbing' : mapView.scale > 1 ? 'grab' : 'zoom-in', touchAction: 'none', userSelect: 'none' }}
          >
            <g transform={`translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})`}>
              <path d={spherePath()} fill="#081823" stroke="#426176" strokeWidth={1.2 / mapView.scale} />
              {[-120,-60,0,60,120].map((lon) => <path key={`lon-${lon}`} d={longitudeLine(lon)} fill="none" stroke="#183247" strokeWidth={0.8 / mapView.scale} opacity=".38" />)}
              {[-60,-30,0,30,60].map((lat) => <path key={`lat-${lat}`} d={latitudeLine(lat)} fill="none" stroke="#183247" strokeWidth={0.8 / mapView.scale} opacity=".38" />)}
              {WORLD_FEATURES.map((country, index) => <path key={String(country.id ?? index)} d={geometryPath(country.geometry)} fill="#17313e" stroke="#426176" strokeWidth={0.62 / mapView.scale} opacity=".97" fillRule="evenodd" />)}
              {visible.map((item) => {
                const p = project(item.longitude!, item.latitude!)
                const fatal = (item.fatalities || 0) > 0
                const discovery = item.sourceTier === 'discovery'
                const active = selected?.id === item.id
                const baseR = active ? 7 : fatal ? 5.2 : 4
                return (
                  <g key={item.id} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setSelected(item) }} style={{ cursor: 'pointer' }}>
                    {active && <circle cx={p.x} cy={p.y} r={13 / mapView.scale} fill="none" stroke="#f8fafc" strokeWidth={2 / mapView.scale} />}
                    <circle cx={p.x} cy={p.y} r={baseR / mapView.scale} fill={discovery ? '#f59e0b' : fatal ? '#fb7185' : '#38bdf8'} stroke="#041019" strokeWidth={1.1 / mapView.scale} opacity={discovery ? .72 : .92}>
                      <title>{`${item.date} · ${item.title} · ${item.location || ''}`}</title>
                    </circle>
                  </g>
                )
              })}
            </g>
          </svg>

          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5, alignItems: 'center', padding: 5, borderRadius: 9, background: 'rgba(4,12,18,.9)', border: '1px solid #29465a', zIndex: 2 }}>
            <button title="Yakınlaştır" onClick={() => zoomCenter(1.45)} style={{ border: '1px solid #315369', borderRadius: 6, background: '#102534', color: '#d9edf7', width: 28, height: 28, cursor: 'pointer', fontSize: 17 }}>+</button>
            <button title="Uzaklaştır" onClick={() => zoomCenter(1 / 1.45)} style={{ border: '1px solid #315369', borderRadius: 6, background: '#102534', color: '#d9edf7', width: 28, height: 28, cursor: 'pointer', fontSize: 17 }}>−</button>
            <button title="Filtrelenmiş sonuçları kadraja al" onClick={fitToResults} style={{ border: '1px solid #315369', borderRadius: 6, background: '#102534', color: '#d9edf7', height: 28, padding: '0 8px', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>FIT</button>
            <button title="Dünya görünümüne dön" onClick={resetView} style={{ border: '1px solid #315369', borderRadius: 6, background: '#102534', color: '#d9edf7', height: 28, padding: '0 8px', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}>RESET</button>
            <span style={{ minWidth: 42, textAlign: 'center', color: '#82ccea', fontSize: 9, fontWeight: 800 }}>{Math.round(mapView.scale * 100)}%</span>
          </div>

          <div style={{ position: 'absolute', left: 12, top: 10, padding: '6px 8px', borderRadius: 8, background: 'rgba(4,12,18,.78)', color: '#8fa6b5', fontSize: 9, pointerEvents: 'none' }}>Tekerlek / trackpad: zoom · sürükle: pan · çift tık: zoom</div>
          <div style={{ position: 'absolute', left: 12, bottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', padding: '6px 8px', borderRadius: 8, background: 'rgba(4,12,18,.84)', fontSize: 9, color: '#aab9c3', pointerEvents: 'none' }}><span style={{ color: '#38bdf8' }}>● Official non-fatal</span><span style={{ color: '#fb7185' }}>● Official fatal</span><span style={{ color: '#f59e0b' }}>● Discovery</span><span>Natural Earth 1 projection · 1:110m borders</span></div>
        </div>

        <div style={{ ...panel, padding: 14, minHeight: 420 }}>
          {selected ? <><div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>{selected.sourceTier === 'discovery' ? 'DISCOVERY' : 'OFFICIAL'} · {selected.date}</div><h3 style={{ margin: '7px 0 8px', fontSize: 18, lineHeight: 1.25 }}>{selected.title}</h3><div style={{ display: 'grid', gap: 6, fontSize: 11, color: '#a7b8c4' }}>{selected.aircraft && <div><b>Aircraft:</b> {selected.aircraft}</div>}{selected.family && <div><b>Family:</b> {selected.family}</div>}{selected.operator && <div><b>Operator:</b> {selected.operator}</div>}{selected.location && <div><b>Location:</b> {selected.location}</div>}<div><b>Region:</b> {regionFor(selected.latitude!, selected.longitude!)}</div>{typeof selected.fatalities === 'number' && <div><b>Fatalities:</b> {selected.fatalities}</div>}</div><p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>{selected.summary}</p><div style={{ borderTop: '1px solid #223747', paddingTop: 9, marginTop: 10, ...small }}>{selected.coordinateSource || 'Structured coordinate'}</div><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}><a href={selected.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Kaynak ↗</a>{selected.reportUrl && <a href={selected.reportUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11 }}>Rapor ↗</a>}{onOpenCase && <button onClick={() => onOpenCase(selected)} style={{ border: '1px solid #2a4b61', borderRadius: 7, background: '#102333', color: '#d7e6ee', padding: '6px 8px', cursor: 'pointer', fontSize: 10 }}>Tam olay kartı</button>}</div></> : <><div style={{ ...small, textTransform: 'uppercase', letterSpacing: '.08em' }}>MAP SELECTION</div><h3 style={{ margin: '7px 0 8px', fontSize: 18 }}>Bir pine tıkla</h3><p style={{ color: '#91a4b2', fontSize: 11, lineHeight: 1.55 }}>Seçilen olayın uçak tipi, operatörü, konumu, ölüm bilgisi ve kaynak bağlantıları burada görünür.</p></>}
        </div>
      </div>

      <div style={{ ...panel, padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
          <div><small style={small}>GÖRÜNEN OLAY</small><strong style={{ display: 'block', fontSize: 18 }}>{visible.length}</strong></div><div><small style={small}>FATAL OLAY</small><strong style={{ display: 'block', fontSize: 18 }}>{fatalEvents}</strong></div><div><small style={small}>OFFICIAL FATALITIES</small><strong style={{ display: 'block', fontSize: 18 }}>{officialFatalities.toLocaleString('tr-TR')}</strong></div><div><small style={small}>TOP TYPE</small><strong style={{ display: 'block', fontSize: 12 }}>{topFamily}</strong></div><div><small style={small}>TOP REGION</small><strong style={{ display: 'block', fontSize: 12 }}>{topRegion}</strong></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div><small style={small}>SEÇİLİ DÖNEM</small><strong style={{ display: 'block', color: '#dceaf3', fontSize: 17, marginTop: 2 }}>{selectedPeriod}</strong></div>
          <div style={{ textAlign: 'right' }}><small style={small}>PENCERE</small><strong style={{ display: 'block', color: '#9edcff', fontSize: 12, marginTop: 2 }}>{windowYears} yıl</strong></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'end', height: 82, gap: 2, borderBottom: '1px solid #294051', paddingBottom: 2 }}>{timeline.map((row) => <button key={row.year} title={`${row.year}: ${row.count}`} onClick={() => setFocusYear(row.year)} style={{ flex: 1, height: `${Math.max(2, (row.count / maxTimeline) * 72)}px`, minWidth: 2, padding: 0, border: 0, background: row.year >= startYear && row.year <= focusYear ? '#38bdf8' : '#29475a', opacity: row.year >= startYear && row.year <= focusYear ? .9 : .55, cursor: 'pointer' }} />)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...small, marginTop: 4 }}><span>{MIN_YEAR}</span><strong style={{ color: '#b8cad5' }}>{selectedPeriod}</strong><span>{MAX_YEAR}</span></div>

        <div style={{ position: 'relative', paddingTop: 34, marginTop: 2 }}>
          <div style={{ position: 'absolute', left: `clamp(38px, ${sliderPercent}%, calc(100% - 38px))`, top: draggingYear ? 0 : 5, transform: 'translateX(-50%)', padding: '5px 8px', borderRadius: 7, background: draggingYear ? '#38bdf8' : '#102b3b', color: draggingYear ? '#03131d' : '#cceeff', border: '1px solid #38bdf8', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: draggingYear ? '0 5px 18px rgba(56,189,248,.28)' : 'none', transition: 'top .12s ease, background .12s ease' }}>{selectedPeriod}</div>
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={focusYear}
            aria-label={`Seçili dönem ${selectedPeriod}`}
            onPointerDown={() => setDraggingYear(true)}
            onPointerUp={() => setDraggingYear(false)}
            onPointerCancel={() => setDraggingYear(false)}
            onBlur={() => setDraggingYear(false)}
            onChange={(e) => setFocusYear(Number(e.target.value))}
            style={{ width: '100%', margin: 0 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>{[1,5,10,20].map((n) => <button key={n} onClick={() => setWindowYears(n)} style={{ border: windowYears === n ? '1px solid #38bdf8' : '1px solid #284154', borderRadius: 7, background: windowYears === n ? '#102a39' : '#09151e', color: '#c8d6df', padding: '6px 8px', cursor: 'pointer', fontSize: 10 }}>{n} yıl</button>)}</div>
        <p style={{ ...small, marginTop: 10 }}>{mapNote || `${mapped.length} koordinatlı kayıt haritada kullanılabilir.`} Altlık: Natural Earth / world-atlas 1:110m; projeksiyon: Natural Earth 1.</p>
      </div>
    </div>
  )
}
