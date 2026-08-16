'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import EngineeringPanel from '@/components/EngineeringPanel'

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

export default function Home() {
  const [selected, setSelected] = useState('wing')
  const [layer, setLayer] = useState('Overview')
  const [damaged, setDamaged] = useState(false)

  const selectPart = (part: string) => {
    setSelected(part)
    if (!['wing', 'front-spar', 'rear-spar', 'rib', 'stringer'].includes(part)) setDamaged(false)
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">AIRCRAFT ENGINEERING LAB</div>
          <div className="subbrand">AEL-300 · widebody long-range twin demonstrator</div>
        </div>
        <div className="status"><span /> V0.2 WING CUTAWAY</div>
      </header>

      <section className="workspace">
        <div className="viewer">
          <div className="viewer-hud">
            <div>
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>Widebody passenger-aircraft proportions inspired by the user reference · wing cutaway enabled</p>
            </div>
            <div className="hud-actions">
              {['fuselage', 'wing', 'front-spar', 'rear-spar', 'rib', 'stringer', 'engine', 'tail'].map((part) => (
                <button key={part} className={selected === part ? 'active' : ''} onClick={() => selectPart(part)}>{part}</button>
              ))}
            </div>
          </div>
          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} />
          <div className="corner-note">ORIGINAL WIDEBODY GEOMETRY · REFERENCE-ALIGNED TOP VIEW · NO OEM CAD DATA</div>
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
