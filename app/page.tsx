'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import EngineeringPanel from '@/components/EngineeringPanel'
import AviationNewsDrawer from '@/components/AviationNewsDrawer'
import CertificationDrawer from '@/components/CertificationDrawer'
import AviationAccidentsDrawer from '@/components/AviationAccidentsDrawer'
import AircraftTypeGuideDrawer from '@/components/AircraftTypeGuideDrawer'

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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">AIRCRAFT ENGINEERING LAB</div>
          <div className="subbrand">AEL-300 · reference-based widebody structural demonstrator</div>
        </div>
        <div className="status"><span /> V0.4 STRUCTURE + KNOWLEDGE</div>
      </header>

      <section className="workspace">
        <div className="viewer">
          <div className="viewer-hud">
            <div>
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>Click WING to reveal the primary wing structure · side tools: news, certification, safety history and passenger aircraft-type intelligence</p>
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
          </div>

          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} />
          <div className="corner-note">REFERENCE-INFORMED STRUCTURAL DEMONSTRATOR · ORIGINAL TRAINING GEOMETRY · NO OEM CAD DATA</div>
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
