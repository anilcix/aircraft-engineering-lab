'use client'

import { engineeringParts, layers } from '@/lib/engineering-data'

type Props = {
  selected: string
  layer: string
  onLayerChange: (layer: string) => void
  damaged: boolean
  onDamageToggle: () => void
}

export default function EngineeringPanel({ selected, layer, onLayerChange, damaged, onDamageToggle }: Props) {
  const part = engineeringParts[selected] ?? engineeringParts.wing

  return (
    <aside className="engineering-panel">
      <div className="eyebrow">SELECTED COMPONENT</div>
      <h2>{part.name}</h2>
      <div className="chip-row">
        <span className="chip">{part.category}</span>
        <span className="chip muted">AEL-180 DEMO</span>
      </div>

      <div className="layer-tabs">
        {layers.map((item) => (
          <button key={item} className={item === layer ? 'layer active' : 'layer'} onClick={() => onLayerChange(item)}>{item}</button>
        ))}
      </div>

      <section><h3>Engineering intent</h3><p>{part.function}</p></section>
      <section><h3>Material concept</h3><p>{part.material}</p></section>
      <section><h3>Primary loads</h3><ul>{part.loads.map((x) => <li key={x}>{x}</li>)}</ul></section>
      <section><h3>Design drivers</h3><ul>{part.designDrivers.map((x) => <li key={x}>{x}</li>)}</ul></section>

      {layer === 'Manufacturing' && <section className="focus-card"><h3>Manufacturing sequence</h3><ol>{part.manufacturing.map((x) => <li key={x}>{x}</li>)}</ol></section>}
      {layer === 'Systems' && <section className="focus-card"><h3>Interfaces</h3><ul>{part.interfaces.map((x) => <li key={x}>{x}</li>)}</ul></section>}

      {selected === 'wing' && (
        <div className={damaged ? 'damage-card danger' : 'damage-card'}>
          <div><strong>Damage Lab — concept mode</strong><p>{damaged ? 'Local wing damage introduced. Load redistribution visualization is the next implementation step.' : 'Inject a conceptual defect into the wing demonstrator.'}</p></div>
          <button onClick={onDamageToggle}>{damaged ? 'Reset damage' : 'Introduce damage'}</button>
        </div>
      )}

      <p className="disclaimer">Educational demonstrator only — not certified aircraft data or an airworthiness assessment.</p>
    </aside>
  )
}
