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

type VerificationSource = { label: string; url: string }

type CurrentFleetProfile = {
  family: string
  status: string
  checkedAt: string
  globalScale?: string
  globalScaleSourceLabel?: string
  globalScaleSourceUrl?: string
  currentOperators: string[]
  verificationSources?: VerificationSource[]
  operatorSnapshots: FleetOperatorSnapshot[]
  note?: string
}

type FleetPayload = {
  updatedAt: string
  methodNote: string
  profiles: CurrentFleetProfile[]
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
    family: 'Airbus A320 Family', segment: 'Single aisle', enteredService: '1988',
    lifeHeadline: '30+ yıl operasyon mümkün; sabit bir takvim son-kullanma tarihi yok',
    lifeDetail: 'A320 ailesinde gerçek yapısal yaşlanma yalnız takvim yaşıyla ölçülmez. Flight cycle, flight hour, bakım programı, korozyon ve fatigue inspection sonuçları birlikte değerlendirilir.',
    inspectionFocus: 'Pressurization cycles · fatigue/aging inspections · corrosion control · repairs',
    sourceLabel: 'Airbus — Operating life', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/operating-life',
  },
  {
    family: 'Airbus A220', segment: 'Small single aisle', enteredService: '2016',
    lifeHeadline: 'Görece genç global filo; yaş yerine kullanım ve bakım profili izlenir',
    lifeDetail: 'A220 filosu 2026 itibarıyla hâlâ gençtir. Yolcu açısından filo yaşı bağlam sağlar ancak airworthiness değerlendirmesi bakım programı, flight hours/cycles ve üretici/otorite gerekliliklerine dayanır.',
    inspectionFocus: 'Flight cycles/hours · scheduled structural inspections · systems reliability · corrosion/impact checks',
    sourceLabel: 'Airbus — A220 Family', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a220-family',
  },
  {
    family: 'Boeing 737 NG', segment: 'Single aisle', enteredService: '1997',
    lifeHeadline: 'Yaştan çok cycle/hour ve bakım geçmişi anlamlıdır',
    lifeDetail: '737 NG kısa sektörlerde yüksek flight-cycle birikimine ulaşabilir. 15–25 yaş tek başına emniyet göstergesi değildir; structural inspections, repairs, corrosion control ve aging-aircraft gereklilikleri belirleyicidir.',
    inspectionFocus: 'Flight cycles · pressurization · structural inspections · repairs/modifications · corrosion',
    sourceLabel: 'FAA — Aging Aircraft Program', sourceUrl: 'https://www.faa.gov/aircraft/air_cert/design_approvals/transport/aging_aircraft',
  },
  {
    family: 'Boeing 737 MAX', segment: 'Single aisle', enteredService: '2017',
    lifeHeadline: 'Genç filo; takvim yaşı bir safety rating değildir',
    lifeDetail: 'MAX filosu görece gençtir. Servis ömrü flight cycle/hour, maintenance programı, AD compliance ve structural inspection eşikleriyle yönetilir.',
    inspectionFocus: 'Flight cycles/hours · scheduled maintenance · AD compliance · structural inspection program',
    sourceLabel: 'Boeing — 737 MAX', sourceUrl: 'https://www.boeing.com/commercial/737max',
  },
  {
    family: 'Embraer E-Jet Family', segment: 'Regional / small mainline jet', enteredService: '2004',
    lifeHeadline: 'İlk nesil ve E2 alt filolarının yaşları birbirinden çok farklı olabilir',
    lifeDetail: 'E170/E175/E190/E195 ile E2 ailesini aynı başlık altında görmek kolaydır ama gerçek filo yaşları alt tipe göre ciddi ayrışır. Bu nedenle rehber havayolu-alt tip satırını ayrı gösterir.',
    inspectionFocus: 'High-cycle regional use · fatigue inspections · landing cycles · engine/APU cycles · repairs',
    sourceLabel: 'Embraer — E-Jets', sourceUrl: 'https://embraer.com/e-jets/en/',
  },
  {
    family: 'ATR 72', segment: 'Regional turboprop', enteredService: '1989',
    lifeHeadline: 'Regional yüksek-cycle kullanımında iniş-kalkış çevrimi kritik bağlamdır',
    lifeDetail: 'ATR 72 gibi turboproplar çok sayıda kısa sektör uçabildiği için calendar age yanında landing/flight cycles özellikle önemlidir. Yaş tek başına emniyet sonucu değildir.',
    inspectionFocus: 'Landing cycles · propeller/engine maintenance · corrosion · pressurization and structural inspections',
    sourceLabel: 'ATR — Aircraft & support', sourceUrl: 'https://www.atr-aircraft.com/',
  },
  {
    family: 'Airbus A330', segment: 'Widebody', enteredService: '1994',
    lifeHeadline: '30+ yıl operasyon ticari uçaklarda olağandışı değildir',
    lifeDetail: 'A330 gibi uzun menzil widebody uçaklarda takvim yaşı yanında yüksek flight-hour birikimi önemlidir. Ömür bakım, upgrade ve inspection programıyla yönetilir.',
    inspectionFocus: 'Flight hours · fatigue/DT inspections · corrosion · landing cycles · heavy checks',
    sourceLabel: 'Airbus — Operating life', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/operating-life',
  },
  {
    family: 'Airbus A350', segment: 'Widebody', enteredService: '2015',
    lifeHeadline: 'Fatigue certification testleri çoklu tasarım ömrü eşdeğerine kadar yürütülür',
    lifeDetail: 'A350 gibi composite-heavy modern widebody uçaklarda operational life approved inspection ve maintenance programıyla yönetilir; takvim yaşı tek başına bir limit değildir.',
    inspectionFocus: 'Composite/metal interfaces · fatigue inspections · flight hours · structural health program',
    sourceLabel: 'Airbus — Test and Certification', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/test-and-certification',
  },
  {
    family: 'Boeing 777', segment: 'Widebody', enteredService: '1995',
    lifeHeadline: 'Yaklaşık 40.000-cycle design-service-objective bağlamı; testlerde çoklu ömür',
    lifeDetail: '777 uzun menzil operasyonunda calendar age kadar flight hours, pressurization/landing cycles, structural inspections ve repair history önemlidir.',
    inspectionFocus: 'Long-haul flight hours · fatigue inspections · structural repairs · landing/pressurization cycles',
    sourceLabel: 'Boeing — 777 Quality Information', sourceUrl: 'https://www.boeing.com/commercial/777/quality-information',
  },
  {
    family: 'Boeing 787', segment: 'Widebody', enteredService: '2011',
    lifeHeadline: 'Composite-heavy yapı; maintenance thresholds ve kullanım profili izlenir',
    lifeDetail: '787’nin composite ağırlıklı yapısı farklı damage/inspection karakteristiğine sahiptir. Servis ömrü yine approved maintenance program, inspection thresholds ve kullanım profiliyle yönetilir.',
    inspectionFocus: 'Composite damage/inspection · flight hours · maintenance thresholds · lightning/impact inspection',
    sourceLabel: 'Boeing — 787 by design', sourceUrl: 'https://www.boeing.com/commercial/787/by-design',
  },
]

const EMPTY_FLEET: FleetPayload = { updatedAt: '', methodNote: '', profiles: [] }
const EMPTY_ACCIDENTS: AccidentPayload = { updatedAt: '', coverageNote: '', items: [] }

function isOfficial(item: Accident) {
  return item.sourceTier !== 'discovery'
}

export default function AircraftTypeGuideDrawer() {
  const [open, setOpen] = useState(false)
  const [fleet, setFleet] = useState<FleetPayload>(EMPTY_FLEET)
  const [accidents, setAccidents] = useState<AccidentPayload>(EMPTY_ACCIDENTS)
  const [selectedFamily, setSelectedFamily] = useState('Airbus A320 Family')
  const [query, setQuery] = useState('')
  const [operatorQuery, setOperatorQuery] = useState('')

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
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LIFE_PROFILES.filter((x) => !q || `${x.family} ${x.segment}`.toLowerCase().includes(q))
  }, [query])

  const selectedLife = LIFE_PROFILES.find((x) => x.family === selectedFamily) || LIFE_PROFILES[0]
  const selectedFleet = currentByFamily.get(selectedFamily)
  const operators = selectedFleet?.currentOperators || []
  const visibleOperators = useMemo(() => {
    const q = operatorQuery.trim().toLowerCase()
    return q ? operators.filter((x) => x.toLowerCase().includes(q)) : operators
  }, [operators, operatorQuery])
  const snapshots = selectedFleet?.operatorSnapshots || []
  const weightedAge = snapshots.length
    ? snapshots.reduce((sum, x) => sum + x.avgAgeYears * x.fleetCount, 0) / snapshots.reduce((sum, x) => sum + x.fleetCount, 0)
    : undefined

  const officialStats = useMemo(() => {
    const items = accidents.items.filter((x) => isOfficial(x) && (x.family || x.aircraft) === selectedFamily)
    return {
      cases: items.length,
      fatalCases: items.filter((x) => (x.fatalities || 0) > 0).length,
      fatalities: items.reduce((sum, x) => sum + (x.fatalities || 0), 0),
    }
  }, [accidents, selectedFamily])

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
            <p>Global operatör kapsamı · havayolu filo yaşı · kaza indeksi · servis ömrü bağlamı</p>
          </div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, borderColor: '#31543d', background: '#0b1b14' }}>
          <strong style={{ display: 'block', fontSize: 12, color: '#bbf7d0' }}>Yaş ≠ emniyet puanı</strong>
          <p style={muted}>5, 15 veya 25 yaş tek başına “daha güvenli / daha tehlikeli” demek değildir. Flight cycle, flight hour, bakım programı, AD uyumu, inspection ve operator maintenance sistemi birlikte değerlendirilir.</p>
        </div>

        <div className="cert-controls" style={{ marginTop: 12 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Uçak tipi ara: A220, A320, 737, E-Jet, ATR, 787..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, .8fr) minmax(0, 2fr)', gap: 14, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rows.map((row) => {
              const fp = currentByFamily.get(row.family)
              return (
                <button key={row.family} onClick={() => { setSelectedFamily(row.family); setOperatorQuery('') }} style={{ ...panel, cursor: 'pointer', textAlign: 'left', color: 'inherit', borderColor: selectedFamily === row.family ? '#38bdf8' : '#24394b' }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{row.family}</strong>
                  <small style={{ color: '#718696' }}>{row.segment} · EIS {row.enteredService}</small>
                  <div style={{ marginTop: 7, color: '#9fb4c5', fontSize: 10 }}>{fp?.status || 'Filo verisi hazırlanıyor'}</div>
                </button>
              )
            })}
          </div>

          <div>
            <div className="eyebrow">{selectedLife.segment.toUpperCase()}</div>
            <h3 style={{ fontSize: 27, margin: '7px 0 4px' }}>{selectedLife.family}</h3>
            <div style={{ color: '#718696', fontSize: 10 }}>Entry into service: {selectedLife.enteredService}</div>

            <div style={grid}>
              <div style={panel}><small style={{ color: '#718696' }}>NAMED ACTIVE OPERATORS</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{operators.length || '—'}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>OFFICIAL INDEXED CASES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.cases}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>INDEXED FATALITIES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.fatalities.toLocaleString('tr-TR')}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>VERIFIED AGE SAMPLE</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{weightedAge != null ? `${weightedAge.toFixed(1)} yıl` : '—'}</strong></div>
            </div>

            {selectedFleet?.globalScale && (
              <section style={{ ...panel, marginBottom: 10, borderColor: '#264b60' }}>
                <div className="dashboard-section-title"><span>Global filo ölçeği</span><small>Manufacturer + independent cross-check</small></div>
                <strong style={{ display: 'block', color: '#dce7ee', fontSize: 14 }}>{selectedFleet.globalScale}</strong>
                {selectedFleet.globalScaleSourceUrl && <a href={selectedFleet.globalScaleSourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 9, color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>{selectedFleet.globalScaleSourceLabel || 'Kaynak'} ↗</a>}
              </section>
            )}

            <section style={{ ...panel, marginBottom: 10 }}>
              <div className="dashboard-section-title"><span>Servis ömrü bağlamı</span><small>Calendar age tek başına limit değildir</small></div>
              <strong style={{ display: 'block', color: '#dce7ee', fontSize: 14 }}>{selectedLife.lifeHeadline}</strong>
              <p style={muted}>{selectedLife.lifeDetail}</p>
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #203446', fontSize: 10, color: '#9fb4c5' }}><b>Engineering focus:</b> {selectedLife.inspectionFocus}</div>
              <a href={selectedLife.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>{selectedLife.sourceLabel} ↗</a>
            </section>

            <section style={{ ...panel, marginBottom: 10 }}>
              <div className="dashboard-section-title"><span>Aktif operatör dizini</span><small>{selectedFleet?.checkedAt || 'snapshot'} · {operators.length} isim</small></div>
              <input value={operatorQuery} onChange={(e) => setOperatorQuery(e.target.value)} placeholder="Bu tipte havayolu ara..." style={{ width: '100%', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px', background: '#08121a', color: '#d9e4ec', marginBottom: 10 }} />
              {visibleOperators.length ? <div className="operator-chips">{visibleOperators.map((x) => <span key={x}>{x}</span>)}</div> : <p style={muted}>Eşleşen operatör yok.</p>}
              <p style={muted}>Bu liste artık birkaç örnekle sınırlı değil; yine de gerçek zamanlı ve hukuken “tam global census” iddiası taşımaz. Leasing, wet-lease, park ve teslimatlar nedeniyle durum değişebilir.</p>
              {(selectedFleet?.verificationSources || []).length > 0 && (
                <div className="accident-links">
                  {selectedFleet?.verificationSources?.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
                </div>
              )}
            </section>

            <section style={panel}>
              <div className="dashboard-section-title"><span>Havayolu bazında filo yaşı</span><small>Yalnız doğrulanmış satırlar</small></div>
              {snapshots.length ? (
                <div className="fleet-age-table">
                  <div className="fleet-age-head"><span>Havayolu</span><span>Tip / alt tip</span><span>Adet</span><span>Ort. yaş</span><span>Kaynak tarihi</span></div>
                  {snapshots.map((row) => (
                    <a className="fleet-age-row" href={row.sourceUrl} target="_blank" rel="noreferrer" key={`${row.airline}-${row.variant}`}>
                      <strong>{row.airline}</strong><span>{row.variant}</span><span>{row.fleetCount}</span><span>{row.avgAgeYears.toFixed(1)} yıl</span><span>{row.sourceUpdatedAt}</span>
                    </a>
                  ))}
                </div>
              ) : <p style={muted}>Bu tip için doğrulanmış havayolu-yaş satırı henüz eklenmedi; tahmin göstermiyoruz.</p>}
              {selectedFleet?.note && <p style={muted}>{selectedFleet.note}</p>}
              <p style={muted}>{fleet.methodNote}</p>
            </section>
          </div>
        </div>

        <div className="drawer-foot">Passenger guide; safety rating değildir. Operator directory ve filo yaşları farklı veri kaynaklarından çapraz kontrol edilir. Son snapshot: {fleet.updatedAt ? new Date(fleet.updatedAt).toLocaleString('tr-TR') : 'yükleniyor'}.</div>
      </aside>
    </>
  )
}
