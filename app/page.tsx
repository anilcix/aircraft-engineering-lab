'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import EngineeringPanel from '@/components/EngineeringPanel'
import AviationNewsDrawer from '@/components/AviationNewsDrawer'
import CertificationDrawer from '@/components/CertificationDrawer'
import AviationAccidentsDrawer from '@/components/AviationAccidentsDrawer'
import AircraftTypeGuideDrawer from '@/components/AircraftTypeGuideDrawer'
import EquipmentSystemsDrawer from '@/components/EquipmentSystemsDrawer'
import MapWheelScrollGuard from '@/components/MapWheelScrollGuard'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

export default function Home() {
  const [selected, setSelected] = useState('fuselage')
  const [layer, setLayer] = useState('Overview')
  const [damaged, setDamaged] = useState(false)
  const [equipmentLocator, setEquipmentLocator] = useState<EquipmentLocatorRequest | null>(null)

  const wingParts = [
    'wing',
    'front-spar',
    'rear-spar',
    'rib',
    'stringer',
    'side-of-body-rib',
    'tank-end-rib',
    'wing-center-section',
    'landing-gear-beam',
    'leading-edge-slat',
    'spoiler',
    'flap',
    'flaperon',
    'aileron',
  ]

  const selectPart = (part: string) => {
    setEquipmentLocator(null)
    setSelected(part)
    if (!wingParts.includes(part)) setDamaged(false)
  }

  const locateEquipment = (equipment: EquipmentLocatorRequest) => {
    const key = `${equipment.region} ${equipment.location}`.toLowerCase()
    if (key.includes('engine') || key.includes('nacelle') || key.includes('pylon')) setSelected('engine')
    else if (key.includes('tail') || key.includes('aft fuselage') || key.includes('vertical tail') || equipment.ata === '49') setSelected('tail')
    else if (key.includes('wing-body') || key.includes('center fuselage') || key.includes('wing center')) setSelected('wing-center-section')
    else if (key.includes('wing') || key.includes('main gear')) setSelected('wing')
    else setSelected('fuselage')
    setDamaged(false)
    setEquipmentLocator(equipment)
  }

  return (
    <main className="shell">
      <MapWheelScrollGuard />

      <header className="topbar">
        <div>
          <div className="brand">AIRCRAFT ENGINEERING LAB</div>
          <div className="subbrand">AEL-300 · reference-based widebody structural & systems demonstrator</div>
        </div>
        <div className="status"><span /> V0.5 STRUCTURE + SYSTEMS + KNOWLEDGE</div>
      </header>

      <section className="workspace">
        <div className="viewer">
          <div className="viewer-hud">
            <div>
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>Click WING to reveal primary structure · use Equipment & Systems for ATA-based aircraft equipment architecture, locations, interactions and redundancy</p>
            </div>
            <div className="hud-actions">
              {['fuselage', 'wing', 'front-spar', 'rear-spar', 'wing-center-section', 'engine', 'tail'].map((part) => (
                <button key={part} className={selected === part ? 'active' : ''} onClick={() => selectPart(part)}>{part}</button>
              ))}
            </div>
          </div>

          <div className="side-tools">
            <AviationNewsDrawer />
            <CertificationDrawer />
            <AviationAccidentsDrawer />
            <AircraftTypeGuideDrawer />
            <EquipmentSystemsDrawer onLocate={locateEquipment} />
          </div>

          <AircraftScene
            selected={selected}
            onSelect={selectPart}
            damaged={damaged}
            equipmentLocator={equipmentLocator}
            onClearEquipmentLocator={() => setEquipmentLocator(null)}
          />
          <div className="corner-note">REFERENCE-INFORMED STRUCTURAL & SYSTEMS DEMONSTRATOR · ORIGINAL TRAINING GEOMETRY · NO OEM CAD DATA</div>
        </div>

        <EngineeringPanel
          selected={selected}
          layer={layer}
          onLayerChange={setLayer}
          damaged={damaged}
          onDamageToggle={() => setDamaged((v) => !v)}
        />
      </section>
    </main>
  )
}
