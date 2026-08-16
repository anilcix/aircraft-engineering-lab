'use client'

import { useMemo, useState } from 'react'

type RuleSource = {
  authority: 'FAA' | 'EASA'
  title: string
  family: string
  topics: string[]
  status: string
  url: string
  note: string
}

const SOURCES: RuleSource[] = [
  { authority: 'FAA', title: '14 CFR Part 21', family: 'Certification Procedures', topics: ['type certification', 'production', 'changes', 'airworthiness'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21', note: 'Certification procedures for products and articles.' },
  { authority: 'FAA', title: '14 CFR Part 23', family: 'Normal Category Airplanes', topics: ['small airplane', 'structures', 'systems', 'flight'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-23', note: 'Airworthiness standards for normal category airplanes.' },
  { authority: 'FAA', title: '14 CFR Part 25', family: 'Transport Category Airplanes', topics: ['transport', 'structures', 'loads', 'fatigue', 'systems', 'flight'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-25', note: 'Primary transport-category certification basis.' },
  { authority: 'FAA', title: '14 CFR Part 26', family: 'Continued Airworthiness', topics: ['continued airworthiness', 'safety improvements', 'aging aircraft'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-26', note: 'Continued airworthiness and safety improvements.' },
  { authority: 'FAA', title: '14 CFR Part 33', family: 'Aircraft Engines', topics: ['engine', 'rotor', 'containment', 'endurance'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-33', note: 'Airworthiness standards for aircraft engines.' },
  { authority: 'FAA', title: '14 CFR Part 35', family: 'Propellers', topics: ['propeller', 'fatigue', 'endurance'], status: 'Current source via FAA/eCFR', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-35', note: 'Airworthiness standards for propellers.' },
  { authority: 'FAA', title: 'FAA Dynamic Regulatory System', family: 'Guidance', topics: ['AC', 'policy', 'orders', 'guidance', 'part 25', 'part 26'], status: 'Continuously updated FAA source', url: 'https://drs.faa.gov/', note: 'Search regulation-linked Advisory Circulars, policy and guidance.' },
  { authority: 'EASA', title: 'Part-21 / Initial Airworthiness', family: 'Certification Procedures', topics: ['type certification', 'design organisation', 'production organisation', 'changes'], status: 'Easy Access Rules', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules', note: 'Initial airworthiness and environmental protection rules.' },
  { authority: 'EASA', title: 'CS-23', family: 'Normal-Category Aeroplanes', topics: ['small aeroplane', 'structures', 'systems', 'flight'], status: 'Easy Access Rules', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules', note: 'Certification Specifications and AMC/GM for normal-category aeroplanes.' },
  { authority: 'EASA', title: 'CS-25', family: 'Large Aeroplanes', topics: ['transport', 'structures', 'loads', 'fatigue', 'systems', 'flight'], status: 'Easy Access Rules', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-large-aeroplanes-cs-25', note: 'Large-aeroplane CS plus associated AMC in consolidated format.' },
  { authority: 'EASA', title: 'CS-E', family: 'Engines', topics: ['engine', 'turbine', 'rotor', 'containment', 'endurance'], status: 'Easy Access Rules', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-engines-cs-e', note: 'Engine certification specifications and AMC.' },
  { authority: 'EASA', title: 'CS-P', family: 'Propellers', topics: ['propeller', 'fatigue', 'endurance'], status: 'EASA certification specification', url: 'https://www.easa.europa.eu/en/document-library/certification-specifications', note: 'Propeller certification specifications.' },
  { authority: 'EASA', title: 'AMC-20', family: 'General Airworthiness AMC', topics: ['systems', 'software', 'EWIS', 'composite', 'continued airworthiness'], status: 'Easy Access Rules', url: 'https://www.easa.europa.eu/en/document-library/easy-access-rules', note: 'General acceptable means of compliance applicable across product categories.' },
]

export default function CertificationDrawer() {
  const [open, setOpen] = useState(false)
  const [authority, setAuthority] = useState<'All' | 'FAA' | 'EASA'>('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SOURCES.filter((item) => (authority === 'All' || item.authority === authority) && (!q || `${item.title} ${item.family} ${item.topics.join(' ')} ${item.note}`.toLowerCase().includes(q)))
  }, [authority, query])

  return (
    <>
      <button className="side-tool certification-tool" onClick={() => setOpen(true)}>Sertifikasyon</button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
      <aside className={open ? 'info-drawer open certification-drawer' : 'info-drawer certification-drawer'}>
        <div className="drawer-head">
          <div><div className="eyebrow">FAA + EASA</div><h2>Sertifikasyon Kütüphanesi</h2><p>Resmî kaynak kataloğu · full-text section index sonraki katman</p></div>
          <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="cert-controls">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Örn. Part 25, CS-25, fatigue, engine..." />
          <div className="drawer-filters">{(['All', 'FAA', 'EASA'] as const).map((x) => <button key={x} className={authority === x ? 'active' : ''} onClick={() => setAuthority(x)}>{x}</button>)}</div>
        </div>
        <div className="news-list">
          {filtered.map((item) => <article className="news-card cert-card" key={`${item.authority}-${item.title}`}>
            <div className="news-meta"><span>{item.authority}</span><span>{item.family}</span></div>
            <h3>{item.title}</h3><p>{item.note}</p><div className="cert-status">{item.status}</div>
            <a href={item.url} target="_blank" rel="noreferrer">Resmî kaynağı aç ↗</a>
          </article>)}
        </div>
        <div className="drawer-foot">Not: Sertifikasyon değerlendirmesinde her zaman gösterilen revision/amendment ve resmî kaynak esas alınmalıdır.</div>
      </aside>
    </>
  )
}
