'use client'

import { useEffect, useMemo, useState } from 'react'

type FleetOperatorSnapshot = {
  airline: string
  variant: string
  fleetCount: number
  avgAgeYears: number
  sourceLabel: string
  sourceUrl: string
  sourceUpdatedAt: string
  note?: string
}

type CurrentFleetProfile = {
  family: string
  status: string
  checkedAt: string
  currentOperators: string[]
  operatorSnapshots: FleetOperatorSnapshot[]
  note?: string
}

type FleetPayload = {
  updatedAt: string
  methodNote: string
  profiles: CurrentFleetProfile[]
}

type LegacyFleetProfile = {
  family: string
  status: string
  checkedAt: string
  currentOperators: string[]
  sourceLabel?: string
  sourceUrl?: string
  note?: string
}

type Accident = {
  id: string
  family?: string
  aircraft?: string
  fatalities?: number
  sourceTier?: string
}

type AccidentPayload = {
  updatedAt: string
  coverageNote: string
  items: Accident[]
  fleetProfiles?: LegacyFleetProfile[]
}

type LifeProfile = {
  family: string
  segment: string
  enteredService: string
  lifeHeadline: string
  lifeDetail: string
  inspectionFocus: string
  sourceLabel: string
  sourceUrl: string
}

const LIFE_PROFILES: LifeProfile[] = [
  {
    family: 'Airbus A320 Family',
    segment: 'Single aisle',
    enteredService: '1988',
    lifeHeadline: '30+ yıl operasyon mümkün; sabit bir takvim son-kullanma tarihi yok',
    lifeDetail: 'Airbus, ticari uçakların 30 yıldan fazla operasyonel hizmette kalabildiğini belirtiyor. A320 gibi kısa/orta menzil uçaklarında gerçek yapısal yaşlanma; takvim yaşının yanında flight cycle, flight hour, bakım programı, korozyon ve fatigue inspection sonuçlarıyla değerlendirilir.',
    inspectionFocus: 'Yüksek cycle kullanımı · pressurization cycles · fatigue/aging inspections · corrosion control',
    sourceLabel: 'Airbus — Operating life',
    sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/operating-life',
  },
  {
    family: 'Boeing 737 NG',
    segment: 'Single aisle',
    enteredService: '1997',
    lifeHeadline: 'Yaştan çok cycle/hour ve bakım geçmişi anlamlıdır',
    lifeDetail: '737 NG filosunda kısa sektör kullanımı yüksek flight-cycle birikimi yaratabilir. Bir uçağın 15–25 yaşında olması tek başına emniyet göstergesi değildir; airworthiness, scheduled structural inspections, repairs ve life-limited/aging-aircraft gereklilikleri belirleyicidir.',
    inspectionFocus: 'Flight cycles · pressurization · structural inspections · repairs/modifications · corrosion',
    sourceLabel: 'FAA — Aging Aircraft Program',
    sourceUrl: 'https://www.faa.gov/aircraft/air_cert/design_approvals/transport/aging_aircraft',
  },
  {
    family: 'Boeing 737 MAX',
    segment: 'Single aisle',
    enteredService: '2017',
    lifeHeadline: 'Genç filo; takvim yaşı tek başına ömür veya emniyet puanı değildir',
    lifeDetail: 'MAX filosu görece gençtir. Uzun dönem servis ömrü yine flight cycle/hour, bakım ve inspection programı, airworthiness directives ve yapısal limitlerle yönetilir. Bu ekranda yaş yalnızca filo bağlamı olarak gösterilir.',
    inspectionFocus: 'Flight cycles/hours · scheduled maintenance · AD compliance · structural inspection program',
    sourceLabel: 'Boeing — 737 MAX design process',
    sourceUrl: 'https://www.boeing.com/commercial/737max/737-max-update/design-process-and-people',
  },
  {
    family: 'Boeing 787',
    segment: 'Widebody',
    enteredService: '2011',
    lifeHeadline: 'Composite-heavy yapı; calendar age yerine bakım eşikleri ve kullanım profili izlenir',
    lifeDetail: '787 gövdesinin yaklaşık yarısı ağırlıkça kompozittir. Boeing, kompozit yapının korozyona daha dirençli olduğunu ve metalik yapılara göre farklı fatigue davranışı sunduğunu vurguluyor. Bununla birlikte servis ömrü yine bakım eşikleri ve approved maintenance program ile yönetilir.',
    inspectionFocus: 'Composite damage/inspection · flight hours · maintenance thresholds · lightning/impact inspection',
    sourceLabel: 'Boeing — 787 by design',
    sourceUrl: 'https://www.boeing.com/commercial/787/by-design',
  },
  {
    family: 'Boeing 777',
    segment: 'Widebody',
    enteredService: '1995',
    lifeHeadline: 'Yaklaşık 40.000-cycle design service objective; testte 120.000 cycle',
    lifeDetail: 'Boeing, klasik 777 fatigue testinin 120.000 cycle — üç design lifetime — seviyesinde tamamlandığını yayımlıyor; bu yaklaşık 40.000-cycle tasarım servis hedefi bağlamı verir. Boeing ayrıca tipin yılda ortalama yaklaşık 700 cycle uçtuğunu ve onlarca yıl hizmet verebildiğini belirtiyor.',
    inspectionFocus: 'Long-haul flight hours · fatigue inspections · structural repairs · landing/pressurization cycles',
    sourceLabel: 'Boeing — 777 Quality Information',
    sourceUrl: 'https://www.boeing.com/commercial/777/quality-information',
  },
  {
    family: 'Airbus A330',
    segment: 'Widebody',
    enteredService: '1994',
    lifeHeadline: '30+ yıl operasyon ticari uçaklarda olağandışı değildir',
    lifeDetail: 'A330 gibi uzun menzil widebody uçaklarda takvim yaşı yanında yüksek flight-hour birikimi önemlidir. Airbus’ın lifecycle yaklaşımı, ticari uçakların 30+ yıl hizmette kalabileceğini ve ömrün bakım/upgrade/inspection ile yönetildiğini vurgular.',
    inspectionFocus: 'Flight hours · fatigue/DT inspections · corrosion · landing cycles · heavy checks',
    sourceLabel: 'Airbus — Operating life',
    sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/operating-life',
  },
  {
    family: 'Airbus A350',
    segment: 'Widebody',
    enteredService: '2015',
    lifeHeadline: 'Fatigue certification testleri üç tasarım ömrü eşdeğerine kadar yürütüldü',
    lifeDetail: 'Airbus, A350 certification fatigue testlerinin uçağın design lifetime değerinin üç katı eşdeğerinde yürütüldüğünü açıklıyor. Bu, yolcu için doğrudan “X yıl sonra biter” anlamına gelmez; operasyonel ömür approved inspection ve maintenance programıyla yönetilir.',
    inspectionFocus: 'Composite/metal interfaces · fatigue inspections · flight hours · structural health/maintenance program',
    sourceLabel: 'Airbus — Test and Certification',
    sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/test-and-certification',
  },
]

const EMPTY_FLEET: FleetPayload = { updatedAt: '', methodNote: '', profiles: [] }
const EMPTY_ACCIDENTS: AccidentPayload = { updatedAt: '', coverageNote: '', items: [], fleetProfiles: [] }

function isOfficial(item: Accident) {
  return item.sourceTier !== 'discovery'
}

export default function AircraftTypeGuideDrawer() {
  const [open, setOpen] = useState(false)
  const [fleet, setFleet] = useState<FleetPayload>(EMPTY_FLEET)
  const [accidents, setAccidents] = useState<AccidentPayload>(EMPTY_ACCIDENTS)
  const [selectedFamily, setSelectedFamily] = useState('Airbus A320 Family')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('./current-fleet-snapshots.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: FleetPayload) => setFleet(data))
      .catch(() => undefined)

    fetch('./aviation-accidents.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: AccidentPayload) => setAccidents(data))
      .catch(() => undefined)
  }, [])

  const currentByFamily = useMemo(() => new Map(fleet.profiles.map((x) => [x.family, x])), [fleet])
  const legacyByFamily = useMemo(() => new Map((accidents.fleetProfiles || []).map((x) => [x.family, x])), [accidents])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LIFE_PROFILES.filter((x) => !q || `${x.family} ${x.segment}`.toLowerCase().includes(q))
  }, [query])

  const selectedLife = LIFE_PROFILES.find((x) => x.family === selectedFamily) || LIFE_PROFILES[0]
  const selectedFleet = currentByFamily.get(selectedFamily)
  const selectedLegacy = legacyByFamily.get(selectedFamily)

  const officialStats = useMemo(() => {
    const items = accidents.items.filter((x) => isOfficial(x) && (x.family || x.aircraft) === selectedFamily)
    return {
      cases: items.length,
      fatalCases: items.filter((x) => (x.fatalities || 0) > 0).length,
      fatalities: items.reduce((sum, x) => sum + (x.fatalities || 0), 0),
    }
  }, [accidents, selectedFamily])

  const operators = selectedFleet?.currentOperators || selectedLegacy?.currentOperators || []
  const snapshots = selectedFleet?.operatorSnapshots || []
  const weightedAge = snapshots.length
    ? snapshots.reduce((sum, x) => sum + x.avgAgeYears * x.fleetCount, 0) / snapshots.reduce((sum, x) => sum + x.fleetCount, 0)
    : undefined

  const panel: React.CSSProperties = { border: '1px solid #24394b', borderRadius: 12, background: '#0b1720', padding: 14 }
  const muted: React.CSSProperties = { color: '#8ca0af', fontSize: 11, lineHeight: 1.55 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 9, margin: '14px 0' }

  return (
    <>
      <button className="side-tool" style={{ borderLeft: '3px solid #22c55e' }} onClick={() => setOpen(true)}>Uçak Tipi Rehberi</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open safety-dashboard-drawer' : 'info-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div>
            <div className="eyebrow">PASSENGER AIRCRAFT INTELLIGENCE</div>
            <h2>Uçak Tipi & Filo Rehberi</h2>
            <p>Bilet öncesi uçak tipi · havayolu filosu · yaş bağlamı · kaza geçmişi · servis ömrü</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, borderColor: '#31543d', background: '#0b1b14' }}>
          <strong style={{ display: 'block', fontSize: 12, color: '#bbf7d0' }}>Yaş ≠ emniyet puanı</strong>
          <p style={muted}>Bir uçağın 5, 15 veya 25 yaşında olması tek başına “daha güvenli / daha tehlikeli” anlamına gelmez. Flight cycle, flight hour, bakım programı, AD uyumu, structural inspection ve operatörün bakım sistemi birlikte değerlendirilir. Ayrıca bilette görünen uçak tipi operasyon günü değişebilir.</p>
        </div>

        <div className="cert-controls" style={{ marginTop: 12 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Uçak tipi ara: A320, 737, 787, 777..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, .8fr) minmax(0, 2fr)', gap: 14, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rows.map((row) => {
              const fp = currentByFamily.get(row.family)
              const lp = legacyByFamily.get(row.family)
              return (
                <button
                  key={row.family}
                  onClick={() => setSelectedFamily(row.family)}
                  style={{ ...panel, cursor: 'pointer', textAlign: 'left', color: 'inherit', borderColor: selectedFamily === row.family ? '#38bdf8' : '#24394b' }}
                >
                  <strong style={{ display: 'block', fontSize: 13 }}>{row.family}</strong>
                  <small style={{ color: '#718696' }}>{row.segment} · EIS {row.enteredService}</small>
                  <div style={{ marginTop: 7, color: '#9fb4c5', fontSize: 10 }}>{fp?.status || lp?.status || 'Aktif filo bağlamı'}</div>
                </button>
              )
            })}
          </div>

          <div>
            <div className="eyebrow">{selectedLife.segment.toUpperCase()}</div>
            <h3 style={{ fontSize: 27, margin: '7px 0 4px' }}>{selectedLife.family}</h3>
            <div style={{ color: '#718696', fontSize: 10 }}>Entry into service: {selectedLife.enteredService}</div>

            <div style={grid}>
              <div style={panel}><small style={{ color: '#718696' }}>OFFICIAL INDEXED CASES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.cases}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>FATAL INDEXED CASES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.fatalCases}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>INDEXED FATALITIES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.fatalities.toLocaleString('tr-TR')}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>VERIFIED FLEET AGE SAMPLE</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{weightedAge != null ? `${weightedAge.toFixed(1)} yıl` : '—'}</strong></div>
            </div>

            <section style={{ ...panel, marginBottom: 10 }}>
              <div className="dashboard-section-title"><span>Servis ömrü bağlamı</span><small>Calendar age tek başına limit değildir</small></div>
              <strong style={{ display: 'block', color: '#dce7ee', fontSize: 14 }}>{selectedLife.lifeHeadline}</strong>
              <p style={muted}>{selectedLife.lifeDetail}</p>
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #203446', fontSize: 10, color: '#9fb4c5' }}><b>Engineering focus:</b> {selectedLife.inspectionFocus}</div>
              <a href={selectedLife.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>{selectedLife.sourceLabel} ↗</a>
            </section>

            <section style={{ ...panel, marginBottom: 10 }}>
              <div className="dashboard-section-title"><span>Bugün hangi havayollarında?</span><small>{selectedFleet?.checkedAt || selectedLegacy?.checkedAt || 'snapshot'}</small></div>
              {operators.length ? (
                <div className="operator-chips">{operators.map((x) => <span key={x}>{x}</span>)}</div>
              ) : <p style={muted}>Bu tip için operatör snapshot’ı henüz eklenmedi.</p>}
              <p style={muted}>Liste seçilmiş aktif operatör örnekleridir; eksiksiz global operator census değildir.</p>
            </section>

            <section style={panel}>
              <div className="dashboard-section-title"><span>Havayolu bazında filo yaşı</span><small>Kaynaklı snapshot</small></div>
              {snapshots.length ? (
                <div className="fleet-age-table">
                  <div className="fleet-age-head"><span>Havayolu</span><span>Tip / alt tip</span><span>Adet</span><span>Ort. yaş</span><span>Kaynak tarihi</span></div>
                  {snapshots.map((row) => (
                    <a className="fleet-age-row" href={row.sourceUrl} target="_blank" rel="noreferrer" key={`${row.airline}-${row.variant}`}>
                      <strong>{row.airline}</strong><span>{row.variant}</span><span>{row.fleetCount}</span><span>{row.avgAgeYears.toFixed(1)} yıl</span><span>{row.sourceUpdatedAt}</span>
                    </a>
                  ))}
                </div>
              ) : <p style={muted}>Bu tip için doğrulanmış havayolu-yaş satırları henüz eklenmedi. Yaş tahmini göstermiyoruz.</p>}
              {selectedFleet?.note && <p style={muted}>{selectedFleet.note}</p>}
            </section>
          </div>
        </div>

        <div className="drawer-foot">
          Passenger guide; bir safety rating değildir. Kaza rakamları yalnızca AEL official-index kayıtlarından türetilir ve tam dünya census’u değildir. Fleet snapshot: {fleet.updatedAt ? new Date(fleet.updatedAt).toLocaleString('tr-TR') : 'yükleniyor'}.
        </div>
      </aside>
    </>
  )
}
