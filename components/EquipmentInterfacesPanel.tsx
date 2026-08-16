'use client'

type Equipment = {
  ata: string
  short: string
  powerSource: string
  inputs: string[]
  outputs: string[]
  interactions: string[]
}

type InterfaceKind = {
  medium: string
  logical: string
  detail: string
}

function classify(label: string, ata: string): InterfaceKind {
  const x = label.toLowerCase()

  if (/bleed|pneumatic|airflow|air flow|ram air|conditioned air|exhaust airflow/.test(x)) {
    return { medium: 'DUCT / TUBE', logical: 'Pneumatic flow', detail: 'Rigid/flexible air ducting, couplings and valves; exact construction is type-specific.' }
  }
  if (/hydraulic|fluid|pressure return|reservoir|brake pressure/.test(x) || ata === '29') {
    return { medium: 'TUBE / HOSE', logical: 'Hydraulic fluid', detail: 'Rigid metal tubing with flexible hose sections near moving/vibration interfaces.' }
  }
  if (/fuel|kerosene|flow to engine|fuel feed|fuel transfer/.test(x) || ata === '28' || ata === '73') {
    return { medium: 'FUEL TUBE / HOSE', logical: 'Fuel flow', detail: 'Fuel-compatible rigid tube/pipe with flexible sections, valves and sealed fittings.' }
  }
  if (/oil|lubrication/.test(x) || ata === '79') {
    return { medium: 'OIL TUBE / HOSE', logical: 'Lubrication flow', detail: 'High-temperature oil tubes/hoses and fittings within propulsion installations.' }
  }
  if (/rf|vhf|satcom|antenna|radio|gnss|gps/.test(x) || ata === '23') {
    return { medium: 'COAX / RF FEED', logical: 'RF signal', detail: 'Shielded coaxial RF feeder between transceiver/receiver and antenna where applicable.' }
  }
  if (/torque|shaft|gearbox|mechanical drive|linkage/.test(x)) {
    return { medium: 'MECHANICAL', logical: 'Mechanical power/motion', detail: 'Shaft, gearbox, linkage or mechanical coupling depending on the installation.' }
  }
  if (/ac power|dc power|electrical power|bus power|battery|generator|essential electrical|electrical bus/.test(x)) {
    return { medium: 'POWER CABLE', logical: 'Electrical power', detail: 'Power feeder/cable, contactors and protection devices sized for the load.' }
  }
  if (/command|status|data|signal|sensor|selection|warning|mode|air data|fms|adiru|controller|computer|display|position/.test(x)) {
    return { medium: 'HARNESS / DATA BUS', logical: 'Signal / digital data', detail: 'Shielded/unshielded wiring harness and, where applicable, aircraft digital data bus.' }
  }
  return { medium: 'HARNESS / PHYSICAL LINE', logical: 'Control / interface', detail: 'Generic interface classification; confirm exact medium in type-specific wiring/system manuals.' }
}

export default function EquipmentInterfacesPanel({ equipment }: { equipment: Equipment }) {
  const rows = [
    ...equipment.inputs.map((label) => ({ from: label, to: equipment.short, label, direction: 'IN' as const, ...classify(label, equipment.ata) })),
    ...equipment.outputs.map((label) => ({ from: equipment.short, to: label, label, direction: 'OUT' as const, ...classify(label, equipment.ata) })),
  ]

  return (
    <section style={{ marginTop: 13, border: '1px solid #355068', borderRadius: 11, background: '#081821', padding: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div>
          <div style={{ color: '#8dd8ff', fontSize: 9, fontWeight: 900, letterSpacing: '.08em' }}>PHYSICAL & DATA INTERFACES</div>
          <div style={{ color: '#7890a0', fontSize: 8.5, marginTop: 3 }}>From → To → nasıl bağlanıyor → ne taşıyor</div>
        </div>
        <span style={{ border: '1px solid #355068', borderRadius: 999, padding: '3px 7px', color: '#9fc4d8', fontSize: 8 }}>GENERIC INFERENCE</span>
      </div>

      <div style={{ display: 'grid', gap: 6, marginTop: 9 }}>
        {rows.map((row, index) => (
          <div key={`${row.direction}-${row.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr .9fr', gap: 6, alignItems: 'center', border: '1px solid #203748', borderRadius: 8, padding: 7, background: '#0a1a24' }}>
            <div style={{ color: '#b8c9d4', fontSize: 8.7, lineHeight: 1.3 }}>{row.from}</div>
            <div style={{ textAlign: 'center', color: row.direction === 'IN' ? '#60a5fa' : '#34d399', fontSize: 11 }}>→</div>
            <div style={{ color: '#dce8ee', fontSize: 8.7, fontWeight: 800, lineHeight: 1.3 }}>{row.to}</div>
            <div>
              <div style={{ color: '#f0abfc', fontSize: 8.2, fontWeight: 900 }}>{row.medium}</div>
              <div style={{ color: '#7890a0', fontSize: 7.8, marginTop: 2 }}>{row.logical}</div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: '#718898', fontSize: 8.2, lineHeight: 1.45, margin: '8px 0 0' }}>
        Medium sınıflandırması ATA ve interface terimlerinden türetilen eğitim amaçlı genel mimaridir. Exact connector, wire spec, tube material/diameter, routing ve separation için tip-spesifik WDM/SSM/AMM gerekir.
      </p>
    </section>
  )
}
