'use client'

import { engineeringParts, layers } from '@/lib/engineering-data'

type Props = {
  selected: string
  layer: string
  onLayerChange: (layer: string) => void
  damaged: boolean
  onDamageToggle: () => void
}

const WING_FAMILY = new Set([
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
])

export default function EngineeringPanel({ selected, layer, onLayerChange, damaged, onDamageToggle }: Props) {
  const part = engineeringParts[selected] ?? engineeringParts.wing

  return (
    <aside className="engineering-panel">
      <div className="eyebrow">SELECTED COMPONENT</div>
      <h2>{part.name}</h2>
      <div className="chip-row">
        <span className="chip">{part.category}</span>
        <span className="chip muted">AEL-300 DEMO</span>
      </div>

      <div className="layer-tabs">
        {layers.map((item) => (
          <button key={item} className={item === layer ? 'layer active' : 'layer'} onClick={() => onLayerChange(item)}>{item}</button>
        ))}
      </div>

      <section>
        <h3>Engineering intent</h3>
        <p>{part.function}</p>
      </section>
      <section>
        <h3>Material concept</h3>
        <p>{part.material}</p>
      </section>
      <section>
        <h3>Primary loads</h3>
        <ul>{part.loads.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <section>
        <h3>Design drivers</h3>
        <ul>{part.designDrivers.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      {layer === 'Manufacturing' && (
        <section className="focus-card">
          <h3>Manufacturing sequence</h3>
          <ol>{part.manufacturing.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
      )}

      {layer === 'Systems' && (
        <section className="focus-card">
          <h3>Interfaces</h3>
          <ul>{part.interfaces.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      )}

      {WING_FAMILY.has(selected) && (
        <div className={damaged ? 'damage-card danger' : 'damage-card'}>
          <div>
            <strong>Damage Lab — concept mode</strong>
            <p>{damaged ? 'A conceptual local defect is active in the wing region. The next step will be load redistribution and risk visualization across the selected structure.' : 'Inject a conceptual defect into the wing or selected wing component.'}</p>
          </div>
          <button onClick={onDamageToggle}>{damaged ? 'Reset damage' : 'Introduce damage'}</button>
        </div>
      )}

      <p className="disclaimer">Educational demonstrator only — not certified aircraft data or an airworthiness assessment.</p>
    </aside>
  )
}
