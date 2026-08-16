'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  name: string
  short?: string
  ata?: string
}

type ImageInfo = {
  url: string
  descriptionUrl: string
  title: string
  artist?: string
  license?: string
}

type CommonsImage = {
  thumburl?: string
  url?: string
  descriptionurl?: string
  width?: number
  height?: number
  mime?: string
  extmetadata?: Record<string, { value?: string }>
}

type CommonsPage = {
  title?: string
  imageinfo?: CommonsImage[]
}

function stripHtml(value?: string) {
  if (!value) return ''
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function usefulTokens(value: string) {
  const stop = new Set(['aircraft', 'system', 'unit', 'assembly', 'left', 'right', 'main', 'primary', 'secondary', 'the', 'and'])
  return normalize(value).split(' ').filter((token) => token.length > 2 && !stop.has(token))
}

function cleanEquipmentName(name: string) {
  return name
    .replace(/—/g, ' ')
    .replace(/\b(left|right)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function searchTerms(name: string, short?: string, ata?: string) {
  const clean = cleanEquipmentName(name)

  const ataHint: Record<string, string> = {
    '21': 'environmental control ECS',
    '22': 'autopilot avionics',
    '23': 'radio avionics',
    '24': 'electrical power',
    '26': 'fire protection',
    '27': 'flight control',
    '28': 'fuel system',
    '29': 'hydraulic system',
    '30': 'ice protection',
    '31': 'avionics display',
    '32': 'landing gear brake',
    '34': 'navigation avionics',
    '35': 'oxygen system',
    '36': 'pneumatic bleed air',
    '38': 'water waste',
    '44': 'cabin system',
    '45': 'maintenance computer avionics',
    '46': 'information system avionics',
    '47': 'inert gas system',
    '49': 'auxiliary power unit APU',
    '52': 'door system',
    '73': 'engine fuel control',
    '74': 'engine ignition',
    '75': 'engine air',
    '77': 'engine indication sensor',
    '78': 'engine exhaust',
    '79': 'engine oil system',
    '80': 'engine starter',
  }

  const shortClean = short?.replace(/[\/]/g, ' ').replace(/\s+/g, ' ').trim()
  const hint = ataHint[ata || ''] || 'aircraft equipment'

  return [
    `Boeing "${clean}"`,
    shortClean ? `Boeing "${shortClean}" aircraft` : '',
    `Boeing "${clean}" ${hint}`,
    `Boeing ${clean} aircraft component`,
    `"${clean}" aircraft aviation component`,
    shortClean ? `"${shortClean}" aircraft aviation component` : '',
    `${clean} ${hint}`,
    clean,
  ].filter(Boolean)
}

const HARD_REJECT = /\b(cover|frontispiece|manual|handbook|catalog|catalogue|report|paper|journal|article|thesis|book|brochure|poster|scan|scanned|page|pages|document|datasheet|data sheet|presentation|slide|advertisement|advert|magazine|newspaper|certificate|patent)\b/i
const VISUAL_REJECT = /\b(logo|icon|symbol|diagram|schematic|scheme|chart|graph|drawing|blueprint|flowchart|block diagram|wiring diagram|cutaway|illustration|infographic|map)\b/i

function scoreCandidate(page: CommonsPage, queryName: string, short?: string) {
  const info = page.imageinfo?.[0]
  if (!info) return -Infinity
  const url = info.thumburl || info.url || ''
  if (!url) return -Infinity

  const title = stripHtml(page.title?.replace(/^File:/, '') || '')
  const meta = info.extmetadata || {}
  const description = stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || meta.Categories?.value || '')
  const haystack = `${title} ${description}`

  if (/\.svg(?:\?|$)/i.test(url) || info.mime === 'image/svg+xml') return -Infinity
  if (HARD_REJECT.test(haystack)) return -Infinity
  if (VISUAL_REJECT.test(haystack)) return -Infinity

  const width = info.width || 0
  const height = info.height || 0
  if (width && height) {
    const ratio = width / height
    if (height > width * 1.45 && height > 1000) return -Infinity
    if (ratio < 0.42 || ratio > 3.4) return -Infinity
  }

  const normalizedHaystack = normalize(haystack)
  const normalizedTitle = normalize(title)
  const nameTokens = usefulTokens(queryName)
  const shortTokens = usefulTokens(short || '')
  let score = 0

  for (const token of nameTokens) {
    if (normalizedTitle.includes(token)) score += 9
    else if (normalizedHaystack.includes(token)) score += 4
  }
  for (const token of shortTokens) {
    if (normalizedTitle.includes(token)) score += 5
    else if (normalizedHaystack.includes(token)) score += 2
  }

  // The AEL-300 is a generic trainer, but the user requested Boeing-first visual references.
  // Prefer Boeing-context equipment photos without making Boeing a hard requirement.
  if (/\bboeing\b/i.test(haystack)) score += 16
  if (/\bairbus\b/i.test(haystack) && !/\bboeing\b/i.test(haystack)) score -= 5

  if (/\baircraft\b|\baviation\b|\bairliner\b|\bjet\b/i.test(haystack)) score += 8
  if (/\bcomponent\b|\bequipment\b|\bavionics\b|\binstalled\b|\binstallation\b/i.test(haystack)) score += 4
  if (/\.(jpe?g|webp|png)(?:\?|$)/i.test(url) || /^image\/(jpeg|png|webp)$/i.test(info.mime || '')) score += 5
  if (/\bphoto\b|\bphotograph\b/i.test(description)) score += 4
  if (width >= 900 && height >= 500) score += 3

  if (/\bplacard\b|\bcaption\b|\bdisplay board\b|\btext panel\b/i.test(haystack)) score -= 10

  return score
}

export default function EquipmentReferenceImage({ name, short, ata }: Props) {
  const [image, setImage] = useState<ImageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const terms = useMemo(() => searchTerms(name, short, ata), [name, short, ata])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    setImage(null)

    const load = async () => {
      let best: { page: CommonsPage; info: CommonsImage; score: number } | null = null

      for (let index = 0; index < terms.length; index++) {
        const term = terms[index]
        try {
          const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            origin: '*',
            generator: 'search',
            gsrsearch: `file:${term}`,
            gsrnamespace: '6',
            gsrlimit: '24',
            prop: 'imageinfo',
            iiprop: 'url|size|mime|extmetadata',
            iiurlwidth: '900',
          })
          const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
          if (!response.ok) continue
          const json = await response.json() as { query?: { pages?: Record<string, CommonsPage> } }
          const pages = Object.values(json.query?.pages || {})

          for (const page of pages) {
            const info = page.imageinfo?.[0]
            if (!info) continue
            let score = scoreCandidate(page, name, short)
            if (!Number.isFinite(score)) continue

            // Give Boeing-prefixed searches a small query-priority bonus in addition to metadata scoring.
            if (index <= 3) score += Math.max(0, 8 - index * 2)

            if (!best || score > best.score) best = { page, info, score }
          }

          // On Boeing-first queries, only stop early for a genuinely strong match.
          if (best && best.score >= 34) break
        } catch {
          // Try the next image-search query.
        }
      }

      if (!best || best.score < 8) {
        if (!cancelled) {
          setFailed(true)
          setLoading(false)
        }
        return
      }

      const meta = best.info.extmetadata || {}
      const result: ImageInfo = {
        url: best.info.thumburl || best.info.url || '',
        descriptionUrl: best.info.descriptionurl || 'https://commons.wikimedia.org/',
        title: best.page.title?.replace(/^File:/, '') || name,
        artist: stripHtml(meta.Artist?.value || meta.Credit?.value),
        license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
      }
      if (!cancelled) {
        setImage(result)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [terms, name, short])

  const shell: React.CSSProperties = {
    border: '1px solid #2b4254',
    borderRadius: 11,
    overflow: 'hidden',
    background: '#07131c',
    marginTop: 12,
  }

  if (loading) return <div style={{ ...shell, minHeight: 180, display: 'grid', placeItems: 'center', color: '#7890a0', fontSize: 10 }}>Boeing öncelikli gerçek ekipman fotoğrafı aranıyor…</div>
  if (failed || !image) return <div style={{ ...shell, padding: 12, color: '#7890a0', fontSize: 10 }}>Bu ekipman için yeterince iyi eşleşen gerçek bir fotoğraf bulunamadı. Boeing sonuçları önce tarandı; belge/şema gibi zayıf sonuçlar özellikle gösterilmedi.</div>

  return (
    <figure style={{ ...shell, marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
      <a href={image.descriptionUrl} target="_blank" rel="noreferrer" title="Görsel kaynak sayfasını aç">
        <img src={image.url} alt={`${name} gerçek ekipman fotoğrafı`} style={{ width: '100%', height: 240, objectFit: 'contain', display: 'block', background: '#050d13' }} />
      </a>
      <figcaption style={{ padding: '8px 10px', borderTop: '1px solid #203545', color: '#7890a0', fontSize: 8.5, lineHeight: 1.45 }}>
        <strong style={{ color: '#b9cad4' }}>REAL EQUIPMENT PHOTO · BOEING-FIRST IMAGE SEARCH</strong><br />
        {image.title}{image.artist ? ` · ${image.artist}` : ''}{image.license ? ` · ${image.license}` : ''}<br />
        Boeing bağlamlı sonuçlar önceliklendirilir; görsel yine de AEL-300 için OEM parça numarası veya exact installation kanıtı değildir.
      </figcaption>
    </figure>
  )
}
