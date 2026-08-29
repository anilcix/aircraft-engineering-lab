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
import DrawerHomeGuard from '@/components/DrawerHomeGuard'
import UiTextTranslator from '@/components/UiTextTranslator'
import { UiLanguageProvider, useUiLanguage } from '@/components/UiLanguage'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

const AircraftScene = dynamic(() => import('@/components/AircraftScene'), { ssr: false })

const PART_LABELS: Record<string, { tr: string; en: string }> = {
  fuselage: { tr: 'Gövde', en: 'Fuselage' },
  wing: { tr: 'Kanat', en: 'Wing' },
  'front-spar': { tr: 'Ön Spar', en: 'Front Spar' },
  'rear-spar': { tr: 'Arka Spar', en: 'Rear Spar' },
  'wing-center-section': { tr: 'WCS', en: 'WCS' },
  engine: { tr: 'Motor', en: 'Engine' },
  tail: { tr: 'Kuyruk', en: 'Tail' },
}

function HomeContent() {
  const { language, setLanguage, tr } = useUiLanguage()
  const [selected, setSelected] = useState('fuselage')
  const [layer, setLayer] = useState('Overview')
  const [damaged, setDamaged] = useState(false)
  const [equipmentLocator, setEquipmentLocator] = useState<EquipmentLocatorRequest | null>(null)
  const [engineeringPanelOpen, setEngineeringPanelOpen] = useState(false)

  const wingParts = ['wing','front-spar','rear-spar','rib','stringer','side-of-body-rib','tank-end-rib','wing-center-section','landing-gear-beam','leading-edge-slat','spoiler','flap','flaperon','aileron']

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

  const jumpToEngineeringPanel = () => {
    setEngineeringPanelOpen(true)
    window.setTimeout(() => {
      document.getElementById('engineering-panel-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <main className="shell" data-language={language}>
      <MapWheelScrollGuard />
      <DrawerHomeGuard />
      <UiTextTranslator />
      <header className="topbar topbar-polished">
        <div>
          <div className="brand">AIRCRAFT ENGINEERING LAB</div>
          <div className="subbrand">AEL-300 · {tr ? 'referans tabanlı geniş gövdeli yapı ve sistem demonstratörü' : 'reference-based widebody structural & systems demonstrator'}</div>
        </div>
        <div className="topbar-actions">
          <div className="language-switch" aria-label="Language selector">
            <button className={language === 'tr' ? 'active' : ''} onClick={() => setLanguage('tr')}>TR</button>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
          </div>
          <div className="status"><span /> V0.8 UI + VERIFIED HARDWARE</div>
        </div>
      </header>

      <section className="workspace" style={!engineeringPanelOpen ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
        <div className="viewer">
          <div className="viewer-hud viewer-hud-polished">
            <div className="hero-copy">
              <div className="eyebrow">DIGITAL TWIN / TRAINING MODEL</div>
              <h1>AEL-300</h1>
              <p>{tr ? 'Yapı, ATA ekipmanları, fiziksel arayüzler, sensör sinyal yolları, gerçek donanım referansları ve yaklaşık 3D yerleşim.' : 'Structure, ATA equipment, physical interfaces, sensor signal paths, verified hardware references and approximate 3D locations.'}</p>
            </div>
            <div className="hud-actions compact-nav">
              {Object.keys(PART_LABELS).map((part) => (
                <button key={part} className={selected === part ? 'active' : ''} onClick={() => selectPart(part)}>{PART_LABELS[part][language]}</button>
              ))}
            </div>
          </div>

          <div className="side-tools compact-tools">
            <AviationNewsDrawer />
            <CertificationDrawer />
            <AviationAccidentsDrawer />
            <AircraftTypeGuideDrawer />
            <EquipmentSystemsDrawer onLocate={locateEquipment} />
            <SensorAtlasDrawer onLocate={locateEquipment} />
            <ImageCuratorDrawer />
          </div>

          <div className="selected-component-controls">
            {!engineeringPanelOpen && (
              <button className="selected-component-toggle" onClick={() => setEngineeringPanelOpen(true)}>
                {tr ? 'Seçili Parça' : 'Selected Component'} ↗
              </button>
            )}
            <button className="selected-component-jump" onClick={jumpToEngineeringPanel} aria-label={tr ? 'Seçili parça bilgilerine git' : 'Jump to selected component details'} title={tr ? 'Bilgilere git' : 'Jump to details'}>↓</button>
          </div>

          <AircraftScene selected={selected} onSelect={selectPart} damaged={damaged} equipmentLocator={equipmentLocator} onClearEquipmentLocator={() => setEquipmentLocator(null)} />
          <div className="corner-note">REFERENCE-INFORMED · ORIGINAL TRAINING GEOMETRY · NO OEM CAD DATA</div>
        </div>

        {engineeringPanelOpen && (
          <div id="engineering-panel-anchor" className="engineering-panel-anchor">
            <EngineeringPanel selected={selected} layer={layer} onLayerChange={setLayer} damaged={damaged} onDamageToggle={() => setDamaged((v) => !v)} collapsed={false} onToggle={() => setEngineeringPanelOpen(false)} />
          </div>
        )}
      </section>
    </main>
  )
}

export default function Home() {
  return <UiLanguageProvider><HomeContent /></UiLanguageProvider>
}
