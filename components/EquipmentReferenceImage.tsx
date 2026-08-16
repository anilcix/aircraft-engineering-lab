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

function stripHtml(value?: string) {
  if (!value) return ''
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function searchTerms(name: string, short?: string, ata?: string) {
  const clean = name
    .replace(/—/g, ' ')
    .replace(/\b(left|right|aircraft|system|unit|computer|assembly)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const ataHint: Record<string, string> = {
    '21': 'aircraft air conditioning',
    '22': 'aircraft autopilot avionics',
    '23': 'aircraft radio avionics',
    '24': 'aircraft electrical generator avionics',
    '26': 'aircraft fire protection',
    '27': 'aircraft flight control',
    '28': 'aircraft fuel system',
    '29': 'aircraft hydraulic',
    '30': 'aircraft ice protection',
    '31': 'aircraft avionics display',
    '32': 'aircraft landing gear brake',
    '34': 'aircraft navigation avionics',
    '36': 'aircraft pneumatic bleed air',
    '49': 'aircraft APU',
    '73': 'aircraft engine fuel control',
    '74': 'aircraft engine ignition',
    '77': 'aircraft engine sensor',
    '79': 'aircraft engine oil system',
  }

  return [
    `${clean} ${ataHint[ata || ''] || 'aircraft'}`,
    short ? `${short} aircraft aviation` : '',
    clean,
  ].filter(Boolean)
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
      for (const term of terms) {
        try {
          const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            origin: '*',
            generator: 'search',
            gsrsearch: `file:${term}`,
            gsrnamespace: '6',
            gsrlimit: '6',
            prop: 'imageinfo',
            iiprop: 'url|extmetadata',
            iiurlwidth: '760',
          })
          const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
          if (!response.ok) continue
          const json = await response.json() as {
            query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }> }> }
          }
          const pages = Object.values(json.query?.pages || {})
          const candidate = pages
            .map((page) => ({ page, info: page.imageinfo?.[0] }))
            .find(({ page, info }) => {
              const url = info?.thumburl || info?.url || ''
              const title = page.title || ''
              return Boolean(url) && !/\.svg(?:\?|$)/i.test(url) && !/logo|icon|symbol|diagram|schematic/i.test(title)
            })
          if (!candidate?.info) continue
          const meta = candidate.info.extmetadata || {}
          const result: ImageInfo = {
            url: candidate.info.thumburl || candidate.info.url || '',
            descriptionUrl: candidate.info.descriptionurl || 'https://commons.wikimedia.org/',
            title: candidate.page.title?.replace(/^File:/, '') || name,
            artist: stripHtml(meta.Artist?.value || meta.Credit?.value),
            license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value),
          }
          if (!cancelled) {
            setImage(result)
            setLoading(false)
          }
          return
        } catch {
          // Try the next search term.
        }
      }
      if (!cancelled) {
        setFailed(true)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [terms, name])

  const shell: React.CSSProperties = {
    border: '1px solid #2b4254',
    borderRadius: 11,
    overflow: 'hidden',
    background: '#07131c',
    marginTop: 12,
  }

  if (loading) return <div style={{ ...shell, minHeight: 180, display: 'grid', placeItems: 'center', color: '#7890a0', fontSize: 10 }}>Gerçek ekipman görseli aranıyor…</div>
  if (failed || !image) return <div style={{ ...shell, padding: 12, color: '#7890a0', fontSize: 10 }}>Bu ekipman için güvenilir bir gerçek görsel otomatik eşleştirilemedi.</div>

  return (
    <figure style={{ ...shell, marginLeft: 0, marginRight: 0, marginBottom: 0 }}>
      <a href={image.descriptionUrl} target="_blank" rel="noreferrer" title="Wikimedia Commons kaynak sayfasını aç">
        <img src={image.url} alt={`${name} için gerçek ekipman referans görseli`} style={{ width: '100%', height: 210, objectFit: 'contain', display: 'block', background: '#050d13' }} />
      </a>
      <figcaption style={{ padding: '8px 10px', borderTop: '1px solid #203545', color: '#7890a0', fontSize: 8.5, lineHeight: 1.45 }}>
        <strong style={{ color: '#b9cad4' }}>REAL-WORLD REFERENCE · Wikimedia Commons</strong><br />
        {image.title}{image.artist ? ` · ${image.artist}` : ''}{image.license ? ` · ${image.license}` : ''}<br />
        Görsel temsilidir; AEL-300 için OEM parça numarası veya exact installation kanıtı değildir.
      </figcaption>
    </figure>
  )
}
