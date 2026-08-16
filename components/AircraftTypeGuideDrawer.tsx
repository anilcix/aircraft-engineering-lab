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

type FleetPayload = { updatedAt: string; methodNote: string; profiles: CurrentFleetProfile[] }

type Accident = {
  id: string
  family?: string
  aircraft?: string
  fatalities?: number
  sourceTier?: string
}

type AccidentPayload = { updatedAt: string; coverageNote: string; items: Accident[] }

type Variant = {
  name: string
  generation: string
  status: string
  role: string
  operatorExamples: string[]
  note?: string
  sourceUrl?: string
}

type VariantFamily = {
  family: string
  sourceLabel: string
  sourceUrl: string
  variants: Variant[]
}

type VariantPayload = { updatedAt: string; methodNote: string; families: VariantFamily[] }

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
  { family: 'Airbus A320 Family', segment: 'Single aisle', enteredService: '1988', lifeHeadline: '30+ yıl operasyon mümkün; sabit bir takvim son-kullanma tarihi yok', lifeDetail: 'A320 ailesinde gerçek yapısal yaşlanma yalnız takvim yaşıyla ölçülmez. Flight cycle, flight hour, bakım programı, korozyon ve fatigue inspection sonuçları birlikte değerlendirilir.', inspectionFocus: 'Pressurization cycles · fatigue/aging inspections · corrosion control · repairs', sourceLabel: 'Airbus — Operating life', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/the-life-cycle-of-an-aircraft/operating-life' },
  { family: 'Airbus A220', segment: 'Small single aisle', enteredService: '2016', lifeHeadline: 'Görece genç global filo; yaş yerine kullanım ve bakım profili izlenir', lifeDetail: 'A220 filosunda filo yaşı bağlam sağlar ancak airworthiness değerlendirmesi bakım programı, flight hours/cycles ve üretici/otorite gerekliliklerine dayanır.', inspectionFocus: 'Flight cycles/hours · structural inspections · systems reliability · corrosion/impact checks', sourceLabel: 'Airbus — A220 Family', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a220-family' },
  { family: 'Boeing 737 NG', segment: 'Single aisle', enteredService: '1997', lifeHeadline: 'Yaştan çok cycle/hour ve bakım geçmişi anlamlıdır', lifeDetail: '737 NG kısa sektörlerde yüksek flight-cycle birikimine ulaşabilir. 15–25 yaş tek başına emniyet göstergesi değildir.', inspectionFocus: 'Flight cycles · pressurization · structural inspections · repairs/modifications · corrosion', sourceLabel: 'FAA — Aging Aircraft Program', sourceUrl: 'https://www.faa.gov/aircraft/air_cert/design_approvals/transport/aging_aircraft' },
  { family: 'Boeing 737 MAX', segment: 'Single aisle', enteredService: '2017', lifeHeadline: 'Genç filo; takvim yaşı bir safety rating değildir', lifeDetail: 'MAX ailesinde aktif hizmet, sertifikalı ancak henüz EIS yapmamış ve sertifikasyon aşamasındaki varyantlar birbirinden ayrılır.', inspectionFocus: 'Flight cycles/hours · scheduled maintenance · AD compliance · structural inspection program', sourceLabel: 'Boeing — 737 MAX', sourceUrl: 'https://www.boeing.com/commercial/737max' },
  { family: 'Embraer E-Jet Family', segment: 'Regional / small mainline jet', enteredService: '2004', lifeHeadline: 'E1 ve E2 alt filolarının yaşları ciddi biçimde ayrışabilir', lifeDetail: 'E170/E175/E190/E195 ile E2 ailesini tek ortalamaya indirmek yanıltıcı olabilir; alt tip drill-down bu nedenle ayrı tutulur.', inspectionFocus: 'High-cycle regional use · fatigue inspections · landing cycles · engine/APU cycles · repairs', sourceLabel: 'Embraer — E-Jets', sourceUrl: 'https://embraer.com/e-jets/en/' },
  { family: 'ATR 72', segment: 'Regional turboprop', enteredService: '1989', lifeHeadline: 'Regional yüksek-cycle kullanımında iniş-kalkış çevrimi kritik bağlamdır', lifeDetail: 'ATR 72 gibi turboproplar çok sayıda kısa sektör uçabildiği için calendar age yanında landing/flight cycles özellikle önemlidir.', inspectionFocus: 'Landing cycles · propeller/engine maintenance · corrosion · structural inspections', sourceLabel: 'ATR', sourceUrl: 'https://www.atr-aircraft.com/' },
  { family: 'Airbus A330', segment: 'Widebody', enteredService: '1994', lifeHeadline: '30+ yıl operasyon ticari uçaklarda olağandışı değildir', lifeDetail: 'A330ceo ve A330neo alt tiplerinin filo yaşları birbirinden ayrıdır; aile yaşını varyant yaşı gibi okumamak gerekir.', inspectionFocus: 'Flight hours · fatigue/DT inspections · corrosion · landing cycles · heavy checks', sourceLabel: 'Airbus — A330 Family', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a330-family' },
  { family: 'Airbus A350', segment: 'Widebody', enteredService: '2015', lifeHeadline: 'Composite-heavy modern widebody; kullanım ve approved inspection programı belirleyicidir', lifeDetail: 'A350-900, ULR ve -1000 farklı görev profillerine sahip olabilir; calendar age tek başına limit değildir.', inspectionFocus: 'Composite/metal interfaces · fatigue inspections · flight hours · structural health program', sourceLabel: 'Airbus — A350 Family', sourceUrl: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a350-family' },
  { family: 'Boeing 777', segment: 'Widebody', enteredService: '1995', lifeHeadline: 'Uzun menzil servis ömrü flight hour/cycle ve yapısal inspection ile yönetilir', lifeDetail: '777 classic yolcu, freighter ve yeni 777X varyantları ayrı operasyonel dönemlere sahiptir.', inspectionFocus: 'Long-haul flight hours · fatigue inspections · structural repairs · landing/pressurization cycles', sourceLabel: 'Boeing — 777', sourceUrl: 'https://www.boeing.com/commercial/airports/3-view' },
  { family: 'Boeing 787', segment: 'Widebody', enteredService: '2011', lifeHeadline: 'Composite-heavy yapı; -8/-9/-10 filolarını ayrı görmek daha anlamlıdır', lifeDetail: '787 varyantları kapasite, menzil ve operatör dağılımında farklılaşır; filo yaşı da alt tip bazında ayrışabilir.', inspectionFocus: 'Composite damage/inspection · flight hours · maintenance thresholds · lightning/impact inspection', sourceLabel: 'Boeing — 787', sourceUrl: 'https://www.boeing.com/commercial/787/' },
]

const EMPTY_FLEET: FleetPayload = { updatedAt: '', methodNote: '', profiles: [] }
const EMPTY_ACCIDENTS: AccidentPayload = { updatedAt: '', coverageNote: '', items: [] }
const EMPTY_VARIANTS: VariantPayload = { updatedAt: '', methodNote: '', families: [] }

function isOfficial(item: Accident) { return item.sourceTier !== 'discovery' }
function norm(text?: string) { return (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '') }

function variantMatchesAircraft(variant: string, aircraft?: string) {
  const a = norm(aircraft)
  const v = norm(variant)
  if (!a) return false
  if (variant === 'A320ceo') return a.includes('A320') && !a.includes('NEO') && !a.includes('A320N')
  if (variant === 'A321ceo') return a.includes('A321') && !a.includes('NEO') && !a.includes('A321N') && !a.includes('XLR')
  if (variant === 'A319ceo') return a.includes('A319') && !a.includes('NEO') && !a.includes('A319N')
  if (variant.includes('neo')) return a.includes(v.replace('NEO', '')) && (a.includes('NEO') || a.endsWith('N'))
  if (variant === '737 MAX 8-200') return a.includes('7378200') || a.includes('737MAX8200')
  if (variant.includes('737 MAX')) return a.includes(v) || a.includes(v.replace('MAX', '')) && a.includes('MAX')
  if (variant === '777F') return a.includes('777F') || a.includes('777FREIGHTER')
  return a.includes(v)
}

function snapshotMatchesVariant(snapshot: FleetOperatorSnapshot, variant?: string | null) {
  if (!variant) return true
  const s = norm(snapshot.variant)
  const v = norm(variant)
  if (variant === 'A320ceo') return s.includes('A320') && !s.includes('NEO')
  if (variant === 'A320neo') return s.includes('A320') && s.includes('NEO')
  if (variant === 'A321neo') return s.includes('A321') && s.includes('NEO')
  if (variant === '737-800') return s.includes('737800')
  if (variant === '737-900ER') return s.includes('737900ER')
  if (variant === '737 MAX 8') return s.includes('MAX8') && !s.includes('8200')
  if (variant === 'A350-900') return s.includes('A350900')
  if (variant === '787-9') return s.includes('7879')
  return s.includes(v)
}

export default function AircraftTypeGuideDrawer() {
  const [open, setOpen] = useState(false)
  const [fleet, setFleet] = useState<FleetPayload>(EMPTY_FLEET)
  const [accidents, setAccidents] = useState<AccidentPayload>(EMPTY_ACCIDENTS)
  const [variants, setVariants] = useState<VariantPayload>(EMPTY_VARIANTS)
  const [selectedFamily, setSelectedFamily] = useState('Airbus A320 Family')
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [operatorQuery, setOperatorQuery] = useState('')

  useEffect(() => {
    fetch('./current-fleet-snapshots.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject()).then(setFleet).catch(() => undefined)
    fetch('./aviation-accidents.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject()).then(setAccidents).catch(() => undefined)
    fetch('./aircraft-variant-guide.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject()).then(setVariants).catch(() => undefined)
  }, [])

  const currentByFamily = useMemo(() => new Map(fleet.profiles.map((x) => [x.family, x])), [fleet])
  const variantByFamily = useMemo(() => new Map(variants.families.map((x) => [x.family, x])), [variants])
  const selectedLife = LIFE_PROFILES.find((x) => x.family === selectedFamily) || LIFE_PROFILES[0]
  const selectedFleet = currentByFamily.get(selectedFamily)
  const selectedVariantFamily = variantByFamily.get(selectedFamily)
  const variant = selectedVariantFamily?.variants.find((x) => x.name === selectedVariant)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LIFE_PROFILES.filter((x) => {
      const familyVariants = variantByFamily.get(x.family)?.variants || []
      return !q || `${x.family} ${x.segment} ${familyVariants.map((v) => v.name).join(' ')}`.toLowerCase().includes(q)
    })
  }, [query, variantByFamily])

  const operators = variant ? variant.operatorExamples : (selectedFleet?.currentOperators || [])
  const visibleOperators = useMemo(() => {
    const q = operatorQuery.trim().toLowerCase()
    return q ? operators.filter((x) => x.toLowerCase().includes(q)) : operators
  }, [operators, operatorQuery])

  const snapshots = (selectedFleet?.operatorSnapshots || []).filter((x) => snapshotMatchesVariant(x, selectedVariant))
  const weightedAge = snapshots.length ? snapshots.reduce((sum, x) => sum + x.avgAgeYears * x.fleetCount, 0) / snapshots.reduce((sum, x) => sum + x.fleetCount, 0) : undefined

  const officialStats = useMemo(() => {
    const items = accidents.items.filter((x) => {
      if (!isOfficial(x)) return false
      if ((x.family || '') !== selectedFamily && !norm(x.aircraft).includes(norm(selectedFamily.replace(' Family', '').replace('Airbus ', '').replace('Boeing ', '')))) return false
      return selectedVariant ? variantMatchesAircraft(selectedVariant, x.aircraft) : true
    })
    return { cases: items.length, fatalCases: items.filter((x) => (x.fatalities || 0) > 0).length, fatalities: items.reduce((sum, x) => sum + (x.fatalities || 0), 0) }
  }, [accidents, selectedFamily, selectedVariant])

  const panel: React.CSSProperties = { border: '1px solid #24394b', borderRadius: 12, background: '#0b1720', padding: 14 }
  const muted: React.CSSProperties = { color: '#8ca0af', fontSize: 11, lineHeight: 1.55 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 9, margin: '14px 0' }

  return (
    <>
      <button className="side-tool" style={{ borderLeft: '3px solid #22c55e' }} onClick={() => setOpen(true)}>Uçak Tipi Rehberi</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open safety-dashboard-drawer' : 'info-drawer safety-dashboard-drawer'}>
        <div className="drawer-head">
          <div><div className="eyebrow">PASSENGER AIRCRAFT INTELLIGENCE</div><h2>Uçak Tipi & Filo Rehberi</h2><p>Aile → varyant → operatör · filo yaşı · kaza indeksi · servis ömrü</p></div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, borderColor: '#31543d', background: '#0b1b14' }}>
          <strong style={{ display: 'block', fontSize: 12, color: '#bbf7d0' }}>Aile ortalaması ≠ varyant ortalaması</strong>
          <p style={muted}>A320ceo, A320neo, A321neo ve A321XLR gibi alt tipler artık ayrı dallar. Alt tip için doğrulanmış yaş satırı yoksa aile yaşını varyant yaşı gibi göstermiyoruz.</p>
        </div>

        <div className="cert-controls" style={{ marginTop: 12 }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Aile veya varyant ara: A320neo, A321XLR, MAX 8, 787-9..." /></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(235px, .8fr) minmax(0, 2fr)', gap: 14, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rows.map((row) => {
              const fp = currentByFamily.get(row.family)
              const children = variantByFamily.get(row.family)?.variants || []
              const familyActive = selectedFamily === row.family
              return (
                <div key={row.family} style={{ ...panel, padding: 8, borderColor: familyActive ? '#315d73' : '#24394b' }}>
                  <button onClick={() => { setSelectedFamily(row.family); setSelectedVariant(null); setOperatorQuery('') }} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', padding: 5 }}>
                    <strong style={{ display: 'block', fontSize: 13 }}>{row.family}</strong>
                    <small style={{ color: '#718696' }}>{row.segment} · EIS {row.enteredService}</small>
                    <div style={{ marginTop: 6, color: '#9fb4c5', fontSize: 10 }}>{fp?.status || 'Filo verisi hazırlanıyor'}</div>
                  </button>
                  {familyActive && children.length > 0 && <div style={{ display: 'grid', gap: 4, marginTop: 6, paddingTop: 6, borderTop: '1px solid #203443' }}>
                    {children.map((child) => <button key={child.name} onClick={() => { setSelectedVariant(child.name); setOperatorQuery('') }} style={{ border: selectedVariant === child.name ? '1px solid #38bdf8' : '1px solid #203443', borderRadius: 7, background: selectedVariant === child.name ? '#102a39' : '#09151e', color: '#c6d5de', textAlign: 'left', padding: '7px 8px', cursor: 'pointer' }}><strong style={{ fontSize: 11 }}>{child.name}</strong><small style={{ display: 'block', color: '#708797', marginTop: 2 }}>{child.status}</small></button>)}
                  </div>}
                </div>
              )
            })}
          </div>

          <div>
            <div className="eyebrow">{variant ? `${selectedFamily.toUpperCase()} / VARIANT` : selectedLife.segment.toUpperCase()}</div>
            <h3 style={{ fontSize: 27, margin: '7px 0 4px' }}>{variant?.name || selectedLife.family}</h3>
            <div style={{ color: '#718696', fontSize: 10 }}>{variant ? `${variant.generation} · ${variant.role}` : `Entry into service: ${selectedLife.enteredService}`}</div>

            {variant && <section style={{ ...panel, marginTop: 12, marginBottom: 10, borderColor: '#305266' }}><div className="dashboard-section-title"><span>Varyant durumu</span><small>{variant.generation}</small></div><strong style={{ color: '#dce8ef' }}>{variant.status}</strong><p style={muted}>{variant.role}</p>{variant.note && <p style={muted}>{variant.note}</p>}<a href={variant.sourceUrl || selectedVariantFamily?.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>Varyant kaynağı ↗</a></section>}

            <div style={grid}>
              <div style={panel}><small style={{ color: '#718696' }}>{variant ? 'NAMED VARIANT OPERATORS' : 'NAMED ACTIVE OPERATORS'}</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{operators.length || '—'}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>OFFICIAL INDEXED CASES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.cases}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>INDEXED FATALITIES</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{officialStats.fatalities.toLocaleString('tr-TR')}</strong></div>
              <div style={panel}><small style={{ color: '#718696' }}>VERIFIED AGE SAMPLE</small><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{weightedAge != null ? `${weightedAge.toFixed(1)} yıl` : '—'}</strong></div>
            </div>

            {!variant && selectedFleet?.globalScale && <section style={{ ...panel, marginBottom: 10, borderColor: '#264b60' }}><div className="dashboard-section-title"><span>Global filo ölçeği</span><small>Manufacturer + independent cross-check</small></div><strong style={{ display: 'block', color: '#dce7ee', fontSize: 14 }}>{selectedFleet.globalScale}</strong>{selectedFleet.globalScaleSourceUrl && <a href={selectedFleet.globalScaleSourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 9, color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>{selectedFleet.globalScaleSourceLabel || 'Kaynak'} ↗</a>}</section>}

            <section style={{ ...panel, marginBottom: 10 }}><div className="dashboard-section-title"><span>Servis ömrü bağlamı</span><small>Calendar age tek başına limit değildir</small></div><strong style={{ display: 'block', color: '#dce7ee', fontSize: 14 }}>{selectedLife.lifeHeadline}</strong><p style={muted}>{selectedLife.lifeDetail}</p><div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #203446', fontSize: 10, color: '#9fb4c5' }}><b>Engineering focus:</b> {selectedLife.inspectionFocus}</div><a href={selectedLife.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, color: '#7dd3fc', fontSize: 11, textDecoration: 'none' }}>{selectedLife.sourceLabel} ↗</a></section>

            <section style={{ ...panel, marginBottom: 10 }}>
              <div className="dashboard-section-title"><span>{variant ? `${variant.name} operatörleri` : 'Aktif operatör dizini'}</span><small>{operators.length} isim</small></div>
              <input value={operatorQuery} onChange={(e) => setOperatorQuery(e.target.value)} placeholder="Bu tipte havayolu ara..." style={{ width: '100%', border: '1px solid #26394a', borderRadius: 8, padding: '8px 9px', background: '#08121a', color: '#d9e4ec', marginBottom: 10 }} />
              {visibleOperators.length ? <div className="operator-chips">{visibleOperators.map((x) => <span key={x}>{x}</span>)}</div> : <p style={muted}>Bu varyant için doğrulanmış/temsilî aktif operatör listesi henüz yok veya eşleşen operatör bulunamadı.</p>}
              {!variant && (selectedFleet?.verificationSources || []).length > 0 && <div className="accident-links">{selectedFleet?.verificationSources?.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>}
            </section>

            <section style={panel}>
              <div className="dashboard-section-title"><span>Havayolu bazında filo yaşı</span><small>{variant ? `${variant.name} eşleşen satırlar` : 'Aile snapshot satırları'}</small></div>
              {snapshots.length ? <div className="fleet-age-table"><div className="fleet-age-head"><span>Havayolu</span><span>Tip / alt tip</span><span>Adet</span><span>Ort. yaş</span><span>Kaynak tarihi</span></div>{snapshots.map((row) => <a className="fleet-age-row" href={row.sourceUrl} target="_blank" rel="noreferrer" key={`${row.airline}-${row.variant}`}><strong>{row.airline}</strong><span>{row.variant}</span><span>{row.fleetCount}</span><span>{row.avgAgeYears.toFixed(1)} yıl</span><span>{row.sourceUpdatedAt}</span></a>)}</div> : <p style={muted}>{variant ? 'Bu varyant için ayrı doğrulanmış yaş satırı henüz yok. Aile yaşını buraya taşımıyoruz.' : 'Bu aile için doğrulanmış havayolu-yaş satırı henüz eklenmedi.'}</p>}
              {selectedFleet?.note && !variant && <p style={muted}>{selectedFleet.note}</p>}
              <p style={muted}>{variants.methodNote || fleet.methodNote}</p>
            </section>
          </div>
        </div>

        <div className="drawer-foot">Passenger guide; safety rating değildir. Aile ve varyant verileri ayrı tutulur. Fleet snapshot: {fleet.updatedAt ? new Date(fleet.updatedAt).toLocaleString('tr-TR') : 'yükleniyor'} · Variant guide: {variants.updatedAt ? new Date(variants.updatedAt).toLocaleString('tr-TR') : 'yükleniyor'}.</div>
      </aside>
    </>
  )
}
