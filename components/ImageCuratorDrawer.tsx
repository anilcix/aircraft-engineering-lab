'use client'

import { useEffect, useMemo, useState } from 'react'

type Target = { id: string; name: string; short: string; ata: string; kind: 'equipment' | 'sensor' }
type Candidate = { url: string; descriptionUrl: string; title: string; license?: string; artist?: string }

type CommonsImage = { thumburl?: string; url?: string; descriptionurl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> }
type CommonsPage = { title?: string; imageinfo?: CommonsImage[] }

function stripHtml(value?: string) {
  if (!value) return ''
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
const REJECT = /\b(cover|manual|handbook|catalog|report|paper|journal|article|thesis|book|brochure|poster|scan|page|document|datasheet|presentation|slide|patent|logo|icon|diagram|schematic|chart|graph|drawing|blueprint|flowchart|wiring|cutaway|illustration|infographic|map)\b/i

export default function ImageCuratorDrawer() {
  const [open, setOpen] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<Candidate | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('./aircraft-equipment-systems.json', { cache: 'no-store' }).then((r) => r.json()),
      fetch('./aircraft-sensors.json', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([eq, sn]) => {
      const list: Target[] = [
        ...(eq.equipment || []).map((x: any) => ({ id: x.id, name: x.name, short: x.short, ata: x.ata, kind: 'equipment' as const })),
        ...(sn.sensors || []).map((x: any) => ({ id: x.id, name: x.name, short: x.short, ata: x.ata, kind: 'sensor' as const })),
      ]
      setTargets(list)
      setSelectedId((current) => current || list[0]?.id || '')
    }).catch(() => undefined)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return targets.filter((x) => !q || `${x.name} ${x.short} ATA ${x.ata} ${x.kind}`.toLowerCase().includes(q))
  }, [targets, query])
  const selected = targets.find((x) => x.id === selectedId) || filtered[0]

  useEffect(() => {
    if (!open || !selected) return
    let cancelled = false
    setLoading(true); setCandidates([]); setDraft(null)
    const load = async () => {
      try {
        const searches = [`Boeing "${selected.name}"`, `Boeing "${selected.short}" aircraft`, `Boeing ${selected.name} component`]
        const found = new Map<string, Candidate>()
        for (const term of searches) {
          const params = new URLSearchParams({ action:'query', format:'json', origin:'*', generator:'search', gsrsearch:`file:${term}`, gsrnamespace:'6', gsrlimit:'18', prop:'imageinfo', iiprop:'url|size|mime|extmetadata', iiurlwidth:'700' })
          const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
          if (!response.ok) continue
          const json = await response.json() as { query?: { pages?: Record<string, CommonsPage> } }
          for (const page of Object.values(json.query?.pages || {})) {
            const info = page.imageinfo?.[0]
            const url = info?.thumburl || info?.url || ''
            const title = page.title?.replace(/^File:/, '') || ''
            const meta = info?.extmetadata || {}
            const desc = stripHtml(meta.ImageDescription?.value || '')
            if (!url || info?.mime === 'image/svg+xml' || REJECT.test(`${title} ${desc}`)) continue
            const w = info?.width || 0, h = info?.height || 0
            if (w && h && (h > w * 1.55 || w / h > 3.6)) continue
            found.set(url, {
              url,
              descriptionUrl: info?.descriptionurl || 'https://commons.wikimedia.org/',
              title,
              artist: stripHtml(meta.Artist?.value || meta.Credit?.value),
              license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
            })
            if (found.size >= 8) break
          }
          if (found.size >= 8) break
        }
        if (!cancelled) { setCandidates([...found.values()].slice(0, 8)); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, selected?.id])

  const choose = (candidate: Candidate) => {
    setDraft(candidate)
    if (!selected) return
    const payload = {
      key: `equipment:${slug(selected.name)}`,
      targetId: selected.id,
      targetKind: selected.kind,
      targetName: selected.name,
      entry: { ...candidate, verifiedAt: new Date().toISOString(), verifiedBy: 'AEL curator' },
    }
    localStorage.setItem('ael-image-curator-draft', JSON.stringify(payload, null, 2))
  }

  const panel: React.CSSProperties = { border:'1px solid #263d50', borderRadius:11, background:'#091721' }
  const muted: React.CSSProperties = { color:'#89a0b0', fontSize:9.5, lineHeight:1.45 }

  return <>
    <button className="side-tool" style={{ borderLeft:'3px solid #f59e0b' }} onClick={() => setOpen(true)}>Image Curator</button>
    {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}
    <aside className={open ? 'info-drawer open safety-dashboard-drawer' : 'info-drawer safety-dashboard-drawer'}>
      <div className="drawer-head">
        <div><div className="eyebrow">REAL HARDWARE / VISUAL VERIFICATION</div><h2>Image Curator</h2><p>Boeing-first candidates → human review → verified catalog</p></div>
        <button className="drawer-close" onClick={() => setOpen(false)}>×</button>
      </div>
      <div style={{ ...panel, padding:11, marginTop:12, borderColor:'#6b5120', background:'#20180b' }}>
        <strong style={{ color:'#fde68a', fontSize:10 }}>CURATION WORKSPACE</strong>
        <p style={{ ...muted, margin:'5px 0 0' }}>Buradaki seçim bu cihazda draft olarak tutulur. Public GitHub Pages güvenli biçimde repo'ya yazamadığı için herkes için kalıcı doğrulama, seçilen kaydın verified-equipment-images.json kataloğuna commitlenmesiyle yapılır.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'300px minmax(500px,1fr)', gap:10, marginTop:10, alignItems:'start' }}>
        <section style={{ ...panel, padding:8, maxHeight:'73vh', overflowY:'auto' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ekipman / sensör ara..." style={{ width:'100%', boxSizing:'border-box', background:'#07131c', border:'1px solid #294052', color:'#dce9f0', borderRadius:8, padding:8, fontSize:10, marginBottom:8 }} />
          {filtered.map((x) => <button key={`${x.kind}-${x.id}`} onClick={() => setSelectedId(x.id)} style={{ width:'100%', textAlign:'left', padding:9, marginBottom:5, borderRadius:8, border:selected?.id === x.id ? '1px solid #f59e0b' : '1px solid #203646', background:selected?.id === x.id ? '#261b0b' : '#0a1822', color:'#e5eef3', cursor:'pointer' }}><span style={{ color:'#fbbf24', fontSize:8.5 }}>ATA {x.ata} · {x.kind.toUpperCase()}</span><strong style={{ display:'block', fontSize:11, marginTop:3 }}>{x.short}</strong><span style={{ color:'#91a6b4', fontSize:8.5 }}>{x.name}</span></button>)}
        </section>
        <section style={{ ...panel, padding:12, maxHeight:'73vh', overflowY:'auto' }}>
          {selected && <><div style={{ color:'#fbbf24', fontSize:9, fontWeight:900 }}>ATA {selected.ata} · {selected.kind.toUpperCase()}</div><h3 style={{ margin:'4px 0 10px' }}>{selected.name}</h3></>}
          {loading ? <div style={{ ...muted, padding:20 }}>Boeing-first gerçek donanım adayları aranıyor…</div> : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>{candidates.map((c, i) => <div key={c.url} style={{ ...panel, overflow:'hidden', borderColor:draft?.url === c.url ? '#22c55e' : '#263d50' }}><a href={c.descriptionUrl} target="_blank" rel="noreferrer"><img src={c.url} alt={c.title} style={{ width:'100%', height:180, objectFit:'contain', background:'#050d13', display:'block' }} /></a><div style={{ padding:8 }}><strong style={{ fontSize:9, color:'#cbd8df' }}>#{i + 1} {c.title}</strong><div style={{ ...muted, marginTop:4 }}>{c.license || 'license metadata unavailable'}</div><button onClick={() => choose(c)} style={{ marginTop:7, border:'1px solid #3f6b48', background:'#102719', color:'#bbf7d0', borderRadius:7, padding:'5px 7px', fontSize:8.5, fontWeight:900, cursor:'pointer' }}>✓ Doğru aday olarak işaretle</button></div></div>)}</div>}
          {!loading && !candidates.length && <p style={muted}>Uygun gerçek donanım adayı bulunamadı.</p>}
          {draft && <div style={{ ...panel, padding:10, marginTop:10, borderColor:'#35543e', background:'#0c1e15' }}><strong style={{ color:'#86efac', fontSize:9 }}>LOCAL CURATION DRAFT HAZIR</strong><p style={{ ...muted, margin:'5px 0 0' }}>Seçim kaydedildi. Bu görsel catalog'a commitlendiğinde ekipman kartında “VERIFIED REAL HARDWARE” olarak kilitlenecek.</p></div>}
        </section>
      </div>
    </aside>
  </>
}
