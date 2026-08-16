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

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

export default function Home() {
  const [selected, setSelected] = useState('fuselage')
  const [layer, setLayer] = useState('Overview')
  const [damaged, setDamaged] = useState(false)

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
    setSelected(part)
    if (!wingParts.includes(part)) setDamaged(false)
  }

  const locateEquipmentRegion = (region: string) => {
    const key = region.toLowerCase()
    if (key.includes('engine') || key.includes('nacelle') || key.includes('pylon')) return selectPart('engine')
    if (key.includes('tail') || key.includes('aft fuselage') || key.includes('vertical tail')) return selectPart('tail')
    if (key.includes('wing-body') || key.includes('center fuselage') || key.includes('wing center')) return selectPart('wing-center-section')
    if (key.includes('wing') || key.includes('main gear')) return selectPart('wing')
    return selectPart('fuselage')
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
            <EquipmentSystemsDrawer onLocate={locateEquipmentRegion} />
          </div>

          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} />
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
