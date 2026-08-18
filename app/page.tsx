'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import EngineeringPanel from '@/components/EngineeringPanel'
import AviationNewsDrawer from '@/components/AviationNewsDrawer'
import CertificationDrawer from '@/components/CertificationDrawer'
import AviationAccidentsDrawer from '@/components/AviationAccidentsDrawer'
import AircraftTypeGuideDrawer from '@/components/AircraftTypeGuideDrawer'
import EquipmentSystemsDrawer from '@/components/EquipmentSystemsDrawer'
import SensorAtlasDrawer from '@/components/SensorAtlasDrawer'
import ImageCuratorDrawer from '@/components/ImageCuratorDrawer'
import MapWheelScrollGuard from '@/components/MapWheelScrollGuard'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

export default function Home() {
  const [selected, setSelected] = useState('fuselage')
  const [layer, setLayer] = useState('Overview')
  const [damaged, setDamaged] = useState(false)
  const [equipmentLocator, setEquipmentLocator] = useState<EquipmentLocatorRequest | null>(null)
  const [engineeringPanelOpen, setEngineeringPanelOpen] = useState(false)

  const wingParts = [
    'wing','front-spar','rear-spar','rib','stringer','side-of-body-rib','tank-end-rib','wing-center-section','landing-gear-beam','leading-edge-slat','spoiler','flap','flaperon','aileron',
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
        <div className="status"><span /> V0.7 VERIFIED HARDWARE + SYSTEM ARCHITECTURE</div>
      </header>

      <section className="workspace" style={!engineeringPanelOpen ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
        <div className="viewer">
          <div className="viewer-hud">
            <div>
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>Structure, ATA equipment, physical interfaces, sensor signal paths, verified real-hardware references and approximate 3D installation locations</p>
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
            <SensorAtlasDrawer onLocate={locateEquipment} />
            <ImageCuratorDrawer />
          </div>

          {!engineeringPanelOpen && (
            <button
              onClick={() => setEngineeringPanelOpen(true)}
              style={{ position: 'absolute', zIndex: 9, right: 14, bottom: 14, border: '1px solid #315064', borderRadius: 9, background: 'rgba(8,19,29,.94)', color: '#d7e4ee', padding: '9px 11px', fontSize: 10, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 28px rgba(0,0,0,.28)' }}
            >
              Selected Component ↗
            </button>
          )}

          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} equipmentLocator={equipmentLocator} onClearEquipmentLocator={() => setEquipmentLocator(null)} />
          <div className="corner-note">REFERENCE-INFORMED STRUCTURAL & SYSTEMS DEMONSTRATOR · ORIGINAL TRAINING GEOMETRY · NO OEM CAD DATA</div>
        </div>

        {engineeringPanelOpen && (
          <EngineeringPanel
            selected={selected}
            layer={layer}
            onLayerChange={setLayer}
            damaged={damaged}
            onDamageToggle={() => setDamaged((v) => !v)}
            collapsed={false}
            onToggle={() => setEngineeringPanelOpen(false)}
          />
        )}
      </section>
    </main>
  )
}
