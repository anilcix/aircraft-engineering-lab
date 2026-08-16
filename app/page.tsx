'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import EngineeringPanel from '@/components/EngineeringPanel'

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

export default function Home() {
  const [selected, setSelected] = useState('fuselage')
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
          <div className="subbrand">AEL-300 · long-range widebody structural demonstrator</div>
        </div>
        <div className="status"><span /> EXTERIOR GEOMETRY REFINEMENT</div>
      </header>

      <section className="workspace">
        <div className="viewer">
          <div className="viewer-hud">
            <div>
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>Reference-aligned widebody silhouette · exterior first · structural cutaway on wing selection</p>
            </div>
            <div className="hud-actions">
              {['fuselage', 'wing', 'engine', 'tail'].map((part) => (
                <button key={part} className={selected === part ? 'active' : ''} onClick={() => selectPart(part)}>{part}</button>
              ))}
            </div>
          </div>
          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} />
          <div className="corner-note">ORIGINAL TRAINING GEOMETRY · WIDEBODY REFERENCE PROPORTIONS · NO OEM CAD DATA</div>
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
