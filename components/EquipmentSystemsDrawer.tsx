'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

type Chapter = { ata: string; name: string }
type Equipment = {
  id: string
  ata: string
  name: string
  short: string
  region: string
  location: string
  purpose: string
  criticality: 'High' | 'Medium' | 'Low'
  redundancyClass: string
  redundancy: string
  powerSource: string
  inputs: string[]
  outputs: string[]
  interactions: string[]
  failureEffect: string
}
type Payload = {
  updatedAt: string
  aircraftClass: string
  scopeNote: string
  chapters: Chapter[]
  equipment: Equipment[]
}

type Props = { onLocate?: (equipment: EquipmentLocatorRequest) => void }

const EMPTY: Payload = { updatedAt: '', aircraftClass: '', scopeNote: '', chapters: [], equipment: [] }

function redundancyIsAvailable(item: Equipment) {
  const single = ['None', 'Monitored'].includes(item.redundancyClass)
  return !single
}

function criticalityRank(value: Equipment['criticality']) {
  return value === 'High' ? 0 : value === 'Medium' ? 1 : 2
}

export default function EquipmentSystemsDrawer({ onLocate }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Payload>(EMPTY)
  const [selectedAta, setSelectedAta] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('All')
  const [criticality, setCriticality] = useState('All')
  const [redundancy, setRedundancy] = useState('All')

  useEffect(() => {
    fetch('./aircraft-equipment-systems.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((payload: Payload) => {
        setData(payload)
        setSelectedId((current) => current || payload.equipment[0]?.id || null)
      })
      .catch(() => undefined)
  }, [])

  const regions = useMemo(() => ['All', ...[...new Set(data.equipment.map((x) => x.region))].sort((a, b) => a.localeCompare(b))], [data])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.equipment
      .filter((item) => selectedAta === 'All' || item.ata === selectedAta)
      .filter((item) => region === 'All' || item.region === region)
      .filter((item) => criticality === 'All' || item.criticality === criticality)
      .filter((item) => redundancy === 'All' || (redundancy === 'Redundant' ? redundancyIsAvailable(item) : !redundancyIsAvailable(item)))
      .filter((item) => !q || `${item.name} ${item.short} ATA ${item.ata} ${item.region} ${item.location} ${item.purpose} ${item.interactions.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => criticalityRank(a.criticality) - criticalityRank(b.criticality) || a.name.localeCompare(b.name))
  }, [data, selectedAta, region, criticality, redundancy, query])

  const selected = data.equipment.find((x) => x.id === selectedId) || filtered[0] || data.equipment[0]
  const selectedChapter = selected ? data.chapters.find((x) => x.ata === selected.ata) : undefined
  const highCritical = data.equipment.filter((x) => x.criticality === 'High').length
  const redundantCount = data.equipment.filter(redundancyIsAvailable).length

  const locateSelected = () => {
    if (!selected || !onLocate) return
    onLocate({ id: selected.id, ata: selected.ata, name: selected.name, short: selected.short, region: selected.region, location: selected.location })
    setOpen(false)
  }

  const panel: React.CSSProperties = { border: '1px solid #263d50', borderRadius: 12, background: '#091721' }
  const muted: React.CSSProperties = { color: '#89a0b0', fontSize: 10.5, lineHeight: 1.5 }
  const badge = (background: string, color: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 7px', background, color, fontSize: 9, fontWeight: 800, letterSpacing: '.04em' })
  const field: React.CSSProperties = { background: '#07131c', border: '1px solid #294052', color: '#dce9f0', borderRadius: 8, padding: '8px 9px', fontSize: 11 }

  return (
    <>
      <button className="side-tool" style={{ borderLeft: '3px solid #a78bfa' }} onClick={() => setOpen(true)}>Equipment & Systems</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open safety-dashboard-drawer' : 'info-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">AIRCRAFT SYSTEMS / ATA ATLAS</div>
            <h2>Equipment & Systems Atlas</h2>
            <p>ATA chapter → ekipman → bölge → amaç → etkileşim → redundancy → failure effect</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, padding: 12, borderColor: '#594b7b', background: '#151126' }}>
          <strong style={{ display: 'block', fontSize: 12, color: '#ddd6fe' }}>GENERIC TRANSPORT ARCHITECTURE · TYPE-SPECIFIC DEĞİL</strong>
          <p style={{ ...muted, margin: '6px 0 0' }}>{data.scopeNote || 'ATA yerleşimi, ekipman sayısı ve redundancy uçak tipine göre değişir.'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, margin: '12px 0' }}>
          <div style={{ ...panel, padding: 10 }}><small style={muted}>ATA CHAPTER</small><strong style={{ display: 'block', fontSize: 18 }}>{data.chapters.length}</strong></div>
          <div style={{ ...panel, padding: 10 }}><small style={muted}>EKİPMAN</small><strong style={{ display: 'block', fontSize: 18 }}>{data.equipment.length}</strong></div>
          <div style={{ ...panel, padding: 10 }}><small style={muted}>HIGH CRITICAL</small><strong style={{ display: 'block', fontSize: 18 }}>{highCritical}</strong></div>
          <div style={{ ...panel, padding: 10 }}><small style={muted}>YEDEKLİ / BACKUP</small><strong style={{ display: 'block', fontSize: 18 }}>{redundantCount}</strong></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .75fr .85fr', gap: 7, marginBottom: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ekipman, ATA, bölge veya etkileşim ara..." style={field} />
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={field}>{regions.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={criticality} onChange={(e) => setCriticality(e.target.value)} style={field}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select>
          <select value={redundancy} onChange={(e) => setRedundancy(e.target.value)} style={field}><option>All</option><option value="Redundant">Yedekli / Backup</option><option value="Single">Single / Monitored</option></select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(260px,.85fr) minmax(360px,1.35fr)', gap: 10, alignItems: 'start' }}>
          <section style={{ ...panel, padding: 8, maxHeight: '68vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedAta('All')} style={{ width: '100%', textAlign: 'left', border: selectedAta === 'All' ? '1px solid #8b5cf6' : '1px solid transparent', borderRadius: 8, background: selectedAta === 'All' ? '#24173c' : 'transparent', color: '#e8eef2', padding: '8px 9px', cursor: 'pointer', marginBottom: 4 }}><b>TÜM ATA</b><span style={{ float: 'right', color: '#91a6b4', fontSize: 9 }}>{data.equipment.length}</span></button>
            {data.chapters.map((chapter) => {
              const count = data.equipment.filter((x) => x.ata === chapter.ata).length
              return <button key={chapter.ata} onClick={() => { setSelectedAta(chapter.ata); const first = data.equipment.find((x) => x.ata === chapter.ata); if (first) setSelectedId(first.id) }} style={{ width: '100%', textAlign: 'left', border: selectedAta === chapter.ata ? '1px solid #8b5cf6' : '1px solid transparent', borderRadius: 8, background: selectedAta === chapter.ata ? '#24173c' : 'transparent', color: '#c9d7df', padding: '7px 8px', cursor: 'pointer', marginBottom: 3 }}>
                <span style={{ display: 'inline-block', width: 46, color: '#c4b5fd', fontWeight: 900 }}>ATA {chapter.ata}</span>
                <span style={{ fontSize: 9.5 }}>{chapter.name}</span>
                <span style={{ float: 'right', color: '#7890a0', fontSize: 9 }}>{count}</span>
              </button>
            })}
          </section>

          <section style={{ ...panel, padding: 8, maxHeight: '68vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 5px 8px', alignItems: 'center' }}><strong style={{ fontSize: 11 }}>Ekipman Listesi</strong><span style={{ ...muted }}>{filtered.length} sonuç</span></div>
            {filtered.map((item) => {
              const active = selected?.id === item.id
              return <button key={item.id} onClick={() => setSelectedId(item.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 10, marginBottom: 6, borderRadius: 9, border: active ? '1px solid #8b5cf6' : '1px solid #203646', background: active ? '#1d1530' : '#0a1822', color: '#e5eef3', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}><span style={{ color: '#c4b5fd', fontSize: 9, fontWeight: 900 }}>ATA {item.ata}</span><span style={badge(item.criticality === 'High' ? '#3a1520' : item.criticality === 'Medium' ? '#392e12' : '#123224', item.criticality === 'High' ? '#fda4af' : item.criticality === 'Medium' ? '#fde68a' : '#86efac')}>{item.criticality}</span></div>
                <strong style={{ display: 'block', marginTop: 5, fontSize: 12 }}>{item.short}</strong>
                <span style={{ display: 'block', marginTop: 2, color: '#93a7b4', fontSize: 9.5, lineHeight: 1.35 }}>{item.name}</span>
                <span style={{ display: 'block', marginTop: 6, color: '#6f899a', fontSize: 9 }}>{item.region}</span>
              </button>
            })}
            {!filtered.length && <p style={{ ...muted, padding: 8 }}>Bu filtrelerle eşleşen ekipman yok.</p>}
          </section>

          <section style={{ ...panel, padding: 15, maxHeight: '68vh', overflowY: 'auto' }}>
            {selected ? <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                <div><div style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' }}>ATA {selected.ata} · {selectedChapter?.name}</div><h3 style={{ margin: '6px 0 2px', fontSize: 20 }}>{selected.name}</h3><div style={{ color: '#7dd3fc', fontSize: 11, fontWeight: 800 }}>{selected.short}</div></div>
                <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}><span style={badge(selected.criticality === 'High' ? '#3a1520' : selected.criticality === 'Medium' ? '#392e12' : '#123224', selected.criticality === 'High' ? '#fda4af' : selected.criticality === 'Medium' ? '#fde68a' : '#86efac')}>{selected.criticality} criticality</span><span style={badge('#182f40', '#93c5fd')}>{selected.redundancyClass}</span></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 13 }}>
                <div style={{ ...panel, padding: 10, background: '#0b1b25' }}><small style={muted}>BÖLGE</small><strong style={{ display: 'block', fontSize: 11, marginTop: 3 }}>{selected.region}</strong><span style={{ ...muted, display: 'block', marginTop: 4 }}>{selected.location}</span>{onLocate && <button onClick={locateSelected} style={{ marginTop: 8, border: '1px solid #7c3aed', borderRadius: 7, background: '#21143a', color: '#ede9fe', padding: '6px 8px', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>Uçakta yerini göster ↗</button>}</div>
                <div style={{ ...panel, padding: 10, background: '#0b1b25' }}><small style={muted}>POWER / SOURCE</small><strong style={{ display: 'block', fontSize: 11, marginTop: 3 }}>{selected.powerSource}</strong></div>
              </div>

              <div style={{ marginTop: 13 }}><small style={muted}>AMAÇ</small><p style={{ margin: '4px 0 0', color: '#d3e0e7', fontSize: 11.5, lineHeight: 1.55 }}>{selected.purpose}</p></div>

              <div style={{ ...panel, padding: 11, marginTop: 13, borderColor: '#34556b', background: '#0a1b27' }}>
                <small style={muted}>SYSTEM INTERACTION FLOW</small>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1.15fr 32px 1fr', gap: 5, alignItems: 'center', marginTop: 9 }}>
                  <div>{selected.inputs.map((x) => <div key={x} style={{ border: '1px solid #294052', borderRadius: 7, padding: '5px 6px', marginBottom: 4, color: '#9fb4c1', fontSize: 9 }}>{x}</div>)}</div>
                  <div style={{ textAlign: 'center', color: '#647f90' }}>→</div>
                  <div style={{ border: '1px solid #8b5cf6', borderRadius: 9, padding: '10px 7px', textAlign: 'center', background: '#22163a', color: '#ede9fe', fontSize: 10, fontWeight: 900 }}>{selected.short}</div>
                  <div style={{ textAlign: 'center', color: '#647f90' }}>→</div>
                  <div>{selected.outputs.map((x) => <div key={x} style={{ border: '1px solid #294052', borderRadius: 7, padding: '5px 6px', marginBottom: 4, color: '#9fb4c1', fontSize: 9 }}>{x}</div>)}</div>
                </div>
              </div>

              <div style={{ marginTop: 13 }}><small style={muted}>ETKİLEŞTİĞİ EKİPMAN / SİSTEMLER</small><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>{selected.interactions.map((x) => <span key={x} style={{ border: '1px solid #2d4658', borderRadius: 999, padding: '4px 7px', color: '#a9c1cf', background: '#0b1a24', fontSize: 9 }}>{x}</span>)}</div></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 13 }}>
                <div style={{ ...panel, padding: 11, borderColor: '#34543e', background: '#0c1e15' }}><small style={{ ...muted, color: '#86efac' }}>REDUNDANCY / BACKUP</small><strong style={{ display: 'block', margin: '4px 0 5px', color: '#bbf7d0', fontSize: 12 }}>{selected.redundancyClass}</strong><p style={{ ...muted, margin: 0 }}>{selected.redundancy}</p></div>
                <div style={{ ...panel, padding: 11, borderColor: '#633746', background: '#211017' }}><small style={{ ...muted, color: '#fda4af' }}>FAILURE EFFECT</small><p style={{ color: '#fecdd3', fontSize: 10.5, lineHeight: 1.5, margin: '5px 0 0' }}>{selected.failureEffect}</p></div>
              </div>
            </> : <p style={muted}>Bir ekipman seç.</p>}
          </section>
        </div>

        <p style={{ ...muted, marginTop: 10 }}>Dataset: {data.aircraftClass || 'transport aircraft'} · güncelleme {data.updatedAt || '—'} · Bu modül eğitim amaçlı sistem mimarisi katmanıdır; bakım/operasyon kararı için tip-spesifik approved data gerekir.</p>
      </aside>
    </>
  )
}
