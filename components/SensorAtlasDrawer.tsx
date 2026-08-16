'use client'

import { useEffect, useMemo, useState } from 'react'
import EquipmentReferenceImage from '@/components/EquipmentReferenceImage'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

type Sensor = {
  id: string
  ata: string
  name: string
  short: string
  family: string
  region: string
  location: string
  measures: string
  sensorType: string
  signal: string
  medium: string
  feeds: string[]
  consumers: string[]
  redundancy: string
  failureEffect: string
}

type Payload = { updatedAt: string; scopeNote: string; sensors: Sensor[] }
type Props = { onLocate?: (sensor: EquipmentLocatorRequest) => void }

const EMPTY: Payload = { updatedAt: '', scopeNote: '', sensors: [] }

export default function SensorAtlasDrawer({ onLocate }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Payload>(EMPTY)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('All')
  const [ata, setAta] = useState('All')

  useEffect(() => {
    fetch('./aircraft-sensors.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((payload: Payload) => {
        setData(payload)
        setSelectedId((current) => current || payload.sensors[0]?.id || null)
      })
      .catch(() => undefined)
  }, [])

  const families = useMemo(() => ['All', ...[...new Set(data.sensors.map((x) => x.family))].sort()], [data])
  const atas = useMemo(() => ['All', ...[...new Set(data.sensors.map((x) => x.ata))].sort((a, b) => Number(a) - Number(b))], [data])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.sensors.filter((x) => {
      if (family !== 'All' && x.family !== family) return false
      if (ata !== 'All' && x.ata !== ata) return false
      if (!q) return true
      return `${x.name} ${x.short} ${x.family} ATA ${x.ata} ${x.region} ${x.measures} ${x.sensorType} ${x.feeds.join(' ')} ${x.consumers.join(' ')}`.toLowerCase().includes(q)
    })
  }, [data, family, ata, query])

  const selected = data.sensors.find((x) => x.id === selectedId) || filtered[0] || data.sensors[0]
  const field: React.CSSProperties = { background: '#07131c', border: '1px solid #294052', color: '#dce9f0', borderRadius: 8, padding: '8px 9px', fontSize: 11 }
  const panel: React.CSSProperties = { border: '1px solid #263d50', borderRadius: 11, background: '#091721' }
  const muted: React.CSSProperties = { color: '#89a0b0', fontSize: 10, lineHeight: 1.5 }

  const locate = () => {
    if (!selected || !onLocate) return
    onLocate({ id: selected.id, ata: selected.ata, name: selected.name, short: selected.short, region: selected.region, location: selected.location })
    setOpen(false)
  }

  return (
    <>
      <button className="side-tool" style={{ borderLeft: '3px solid #22d3ee' }} onClick={() => setOpen(true)}>Sensors</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open safety-dashboard-drawer' : 'info-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">SENSING / SIGNAL ARCHITECTURE</div>
            <h2>Aircraft Sensor Atlas</h2>
            <p>Ne ölçer → hangi sensör → hangi sinyal → kimi besler → hangi fonksiyon kullanır</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, padding: 11, borderColor: '#23596a', background: '#0a1c22' }}>
          <strong style={{ color: '#a5f3fc', fontSize: 11 }}>GENERIC TRANSPORT SENSOR ARCHITECTURE</strong>
          <p style={{ ...muted, margin: '5px 0 0' }}>{data.scopeNote}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr .7fr', gap: 7, margin: '11px 0' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pitot, pressure, N1, fuel quantity, FCC..." style={field} />
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={field}>{families.map((x) => <option key={x}>{x}</option>)}</select>
          <select value={ata} onChange={(e) => setAta(e.target.value)} style={field}>{atas.map((x) => <option key={x}>{x === 'All' ? 'Tüm ATA' : `ATA ${x}`}</option>)}</select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(420px,1fr)', gap: 10, alignItems: 'start' }}>
          <section style={{ ...panel, padding: 8, maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 5px 8px' }}><strong style={{ fontSize: 11 }}>Sensör Listesi</strong><span style={muted}>{filtered.length} / {data.sensors.length}</span></div>
            {filtered.map((item) => {
              const active = selected?.id === item.id
              return <button key={item.id} onClick={() => setSelectedId(item.id)} style={{ width: '100%', display: 'block', textAlign: 'left', border: active ? '1px solid #22d3ee' : '1px solid #203646', borderRadius: 9, background: active ? '#0d2a32' : '#0a1822', color: '#e5eef3', padding: 10, marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}><span style={{ color: '#67e8f9', fontSize: 9, fontWeight: 900 }}>ATA {item.ata}</span><span style={{ color: '#8098a7', fontSize: 8.5 }}>{item.family}</span></div>
                <strong style={{ display: 'block', marginTop: 5, fontSize: 12 }}>{item.short}</strong>
                <span style={{ display: 'block', marginTop: 2, color: '#9bb0bc', fontSize: 9.5 }}>{item.name}</span>
                <span style={{ display: 'block', marginTop: 6, color: '#6f899a', fontSize: 8.5 }}>Ölçer: {item.measures}</span>
              </button>
            })}
          </section>

          <section style={{ ...panel, padding: 14, maxHeight: '72vh', overflowY: 'auto' }}>
            {selected ? <>
              <div style={{ color: '#67e8f9', fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em' }}>ATA {selected.ata} · {selected.family}</div>
              <h3 style={{ margin: '5px 0 2px', fontSize: 20 }}>{selected.name}</h3>
              <div style={{ color: '#b5c7d2', fontSize: 10 }}>{selected.location}</div>

              <EquipmentReferenceImage name={selected.name} short={selected.short} ata={selected.ata} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 11 }}>
                <div style={{ ...panel, padding: 10 }}><small style={muted}>NE ÖLÇER?</small><strong style={{ display: 'block', marginTop: 4, fontSize: 11.5 }}>{selected.measures}</strong></div>
                <div style={{ ...panel, padding: 10 }}><small style={muted}>SENSÖR PRENSİBİ</small><strong style={{ display: 'block', marginTop: 4, fontSize: 11.5 }}>{selected.sensorType}</strong></div>
                <div style={{ ...panel, padding: 10 }}><small style={muted}>SİNYAL</small><strong style={{ display: 'block', marginTop: 4, fontSize: 10.5 }}>{selected.signal}</strong></div>
                <div style={{ ...panel, padding: 10 }}><small style={muted}>FİZİKSEL BAĞLANTI</small><strong style={{ display: 'block', marginTop: 4, fontSize: 10.5, color: '#f0abfc' }}>{selected.medium}</strong></div>
              </div>

              <div style={{ ...panel, padding: 11, marginTop: 10, borderColor: '#27516a' }}>
                <small style={muted}>SIGNAL PATH</small>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr 30px 1fr', gap: 5, alignItems: 'center', marginTop: 8 }}>
                  <div style={{ border: '1px solid #294052', borderRadius: 8, padding: 8, color: '#b4c8d4', fontSize: 9 }}>{selected.measures}</div>
                  <div style={{ textAlign: 'center', color: '#67e8f9' }}>→</div>
                  <div style={{ border: '1px solid #22d3ee', borderRadius: 8, padding: 8, background: '#0d2a32', textAlign: 'center', color: '#cffafe', fontWeight: 900, fontSize: 9 }}>{selected.short}</div>
                  <div style={{ textAlign: 'center', color: '#67e8f9' }}>→</div>
                  <div>{selected.feeds.map((x) => <div key={x} style={{ border: '1px solid #294052', borderRadius: 7, padding: '5px 6px', marginBottom: 4, color: '#b4c8d4', fontSize: 8.5 }}>{x}</div>)}</div>
                </div>
              </div>

              <div style={{ marginTop: 11 }}><small style={muted}>BU VERİYİ KULLANAN FONKSİYONLAR</small><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>{selected.consumers.map((x) => <span key={x} style={{ border: '1px solid #2c4658', borderRadius: 999, padding: '4px 7px', color: '#b7cbd6', fontSize: 8.5 }}>{x}</span>)}</div></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 11 }}>
                <div style={{ ...panel, padding: 10, borderColor: '#35543e', background: '#0c1e15' }}><small style={{ ...muted, color: '#86efac' }}>REDUNDANCY</small><p style={{ margin: '5px 0 0', color: '#bbf7d0', fontSize: 9.5, lineHeight: 1.45 }}>{selected.redundancy}</p></div>
                <div style={{ ...panel, padding: 10, borderColor: '#633746', background: '#211017' }}><small style={{ ...muted, color: '#fda4af' }}>FAILURE EFFECT</small><p style={{ margin: '5px 0 0', color: '#fecdd3', fontSize: 9.5, lineHeight: 1.45 }}>{selected.failureEffect}</p></div>
              </div>

              {onLocate && <button onClick={locate} style={{ marginTop: 11, border: '1px solid #0891b2', borderRadius: 8, background: '#0d2a32', color: '#cffafe', padding: '7px 9px', fontSize: 9.5, fontWeight: 900, cursor: 'pointer' }}>Sensörü uçakta göster ↗</button>}
            </> : <p style={muted}>Bir sensör seç.</p>}
          </section>
        </div>
      </aside>
    </>
  )
}
