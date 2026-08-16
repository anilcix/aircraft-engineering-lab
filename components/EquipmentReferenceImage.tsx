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
    '21': 'aircraft environmental control aviation',
    '22': 'aircraft autopilot avionics',
    '23': 'aircraft radio avionics',
    '24': 'aircraft electrical aviation',
    '26': 'aircraft fire protection aviation',
    '27': 'aircraft flight control aviation',
    '28': 'aircraft fuel aviation',
    '29': 'aircraft hydraulic aviation',
    '30': 'aircraft ice protection aviation',
    '31': 'aircraft avionics aviation',
    '32': 'aircraft landing gear brake aviation',
    '34': 'aircraft navigation avionics aviation',
    '35': 'aircraft oxygen aviation',
    '36': 'aircraft pneumatic bleed air aviation',
    '38': 'aircraft water waste aviation',
    '44': 'aircraft cabin aviation',
    '45': 'aircraft maintenance computer avionics',
    '46': 'aircraft information system avionics',
    '47': 'aircraft inert gas aviation',
    '49': 'aircraft auxiliary power unit APU aviation',
    '52': 'aircraft door aviation',
    '73': 'aircraft engine fuel control aviation',
    '74': 'aircraft engine ignition aviation',
    '75': 'aircraft engine air aviation',
    '77': 'aircraft engine indication sensor aviation',
    '78': 'aircraft engine exhaust aviation',
    '79': 'aircraft engine oil aviation',
    '80': 'aircraft engine starter aviation',
  }

  const shortClean = short?.replace(/[\/]/g, ' ').replace(/\s+/g, ' ').trim()
  return [
    `"${clean}" ${ataHint[ata || ''] || 'aircraft aviation'}`,
    `${clean} aircraft aviation component`,
    shortClean ? `"${shortClean}" aircraft aviation component` : '',
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
    // Strongly portrait, page-like images are commonly scans/manual pages rather than equipment photos.
    if (height > width * 1.45 && height > 1000) return -Infinity
    if (ratio < 0.42 || ratio > 3.4) return -Infinity
  }

  const normalizedHaystack = normalize(haystack)
  const nameTokens = usefulTokens(queryName)
  const shortTokens = usefulTokens(short || '')
  let score = 0

  for (const token of nameTokens) {
    if (normalize(title).includes(token)) score += 9
    else if (normalizedHaystack.includes(token)) score += 4
  }
  for (const token of shortTokens) {
    if (normalize(title).includes(token)) score += 5
    else if (normalizedHaystack.includes(token)) score += 2
  }

  if (/\baircraft\b|\baviation\b|\bairliner\b|\bboeing\b|\bairbus\b|\bjet\b/i.test(haystack)) score += 8
  if (/\bcomponent\b|\bequipment\b|\bavionics\b|\binstalled\b|\binstallation\b/i.test(haystack)) score += 4
  if (/\.(jpe?g|webp|png)(?:\?|$)/i.test(url) || /^image\/(jpeg|png|webp)$/i.test(info.mime || '')) score += 5
  if (/\bphoto\b|\bphotograph\b/i.test(description)) score += 4
  if (width >= 900 && height >= 500) score += 3

  // Mildly penalize museum placards or text-dominant contextual images without rejecting useful exhibits.
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

      for (const term of terms) {
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
            const score = scoreCandidate(page, name, short)
            if (!Number.isFinite(score)) continue
            if (!best || score > best.score) best = { page, info, score }
          }

          // A strong title/content match is good enough; avoid progressively broader queries replacing it.
          if (best && best.score >= 24) break
        } catch {
          // Try the next image-search query.
        }
      }

      // Do not display a weak, likely unrelated image simply because one exists.
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

  if (loading) return <div style={{ ...shell, minHeight: 180, display: 'grid', placeItems: 'center', color: '#7890a0', fontSize: 10 }}>Ekipmanın gerçek fotoğrafı aranıyor…</div>
  if (failed || !image) return <div style={{ ...shell, padding: 12, color: '#7890a0', fontSize: 10 }}>Bu ekipman için yeterince iyi eşleşen gerçek bir fotoğraf bulunamadı. Belge/şema gibi zayıf sonuçlar özellikle gösterilmedi.</div>

  return (
    <figure style={{ ...shell, marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
      <a href={image.descriptionUrl} target="_blank" rel="noreferrer" title="Görsel kaynak sayfasını aç">
        <img src={image.url} alt={`${name} gerçek ekipman fotoğrafı`} style={{ width: '100%', height: 240, objectFit: 'contain', display: 'block', background: '#050d13' }} />
      </a>
      <figcaption style={{ padding: '8px 10px', borderTop: '1px solid #203545', color: '#7890a0', fontSize: 8.5, lineHeight: 1.45 }}>
        <strong style={{ color: '#b9cad4' }}>REAL EQUIPMENT PHOTO · Wikimedia Commons image search</strong><br />
        {image.title}{image.artist ? ` · ${image.artist}` : ''}{image.license ? ` · ${image.license}` : ''}<br />
        Görsel, ekipman adına göre fotoğraf sonuçları arasından otomatik seçilir; AEL-300 için OEM parça numarası veya exact installation kanıtı değildir.
      </figcaption>
    </figure>
  )
}
