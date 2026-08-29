'use client'

import { useEffect } from 'react'
import { useUiLanguage } from '@/components/UiLanguage'

const DICTIONARY: Array<{ en: string; tr: string }> = [
  { en: 'Equipment & Systems', tr: 'Ekipman & Sistemler' },
  { en: 'Equipment & Systems Atlas', tr: 'Ekipman & Sistemler Atlası' },
  { en: 'Aircraft Sensor Atlas', tr: 'Uçak Sensör Atlası' },
  { en: 'Sensors', tr: 'Sensörler' },
  { en: 'Image Curator', tr: 'Görsel Doğrulama' },
  { en: 'Aircraft Types', tr: 'Uçak Tipleri' },
  { en: 'Certification', tr: 'Sertifikasyon' },
  { en: 'Selected Component', tr: 'Seçili Parça' },
  { en: 'Equipment List', tr: 'Ekipman Listesi' },
  { en: 'Sensor List', tr: 'Sensör Listesi' },
  { en: 'All', tr: 'Tümü' },
  { en: 'All ATA', tr: 'TÜM ATA' },
  { en: 'Search', tr: 'Ara' },
  { en: 'Purpose', tr: 'Amaç' },
  { en: 'PURPOSE', tr: 'AMAÇ' },
  { en: 'Region', tr: 'Bölge' },
  { en: 'REGION', tr: 'BÖLGE' },
  { en: 'POWER / SOURCE', tr: 'GÜÇ / KAYNAK' },
  { en: 'SYSTEM INTERACTION FLOW', tr: 'SİSTEM ETKİLEŞİM AKIŞI' },
  { en: 'PHYSICAL / DATA INTERFACES', tr: 'FİZİKSEL / VERİ ARAYÜZLERİ' },
  { en: 'WHAT DOES IT MEASURE?', tr: 'NE ÖLÇER?' },
  { en: 'SENSOR PRINCIPLE', tr: 'SENSÖR PRENSİBİ' },
  { en: 'SIGNAL', tr: 'SİNYAL' },
  { en: 'PHYSICAL CONNECTION', tr: 'FİZİKSEL BAĞLANTI' },
  { en: 'SIGNAL PATH', tr: 'SİNYAL YOLU' },
  { en: 'FUNCTIONS USING THIS DATA', tr: 'BU VERİYİ KULLANAN FONKSİYONLAR' },
  { en: 'REDUNDANCY', tr: 'YEDEKLİLİK' },
  { en: 'FAILURE EFFECT', tr: 'ARIZA ETKİSİ' },
  { en: 'High', tr: 'Yüksek' },
  { en: 'Medium', tr: 'Orta' },
  { en: 'Low', tr: 'Düşük' },
  { en: 'High criticality', tr: 'Yüksek kritiklik' },
  { en: 'Medium criticality', tr: 'Orta kritiklik' },
  { en: 'Low criticality', tr: 'Düşük kritiklik' },
  { en: 'Redundant / Backup', tr: 'Yedekli / Backup' },
  { en: 'Single / Monitored', tr: 'Tekli / İzlenen' },
  { en: 'Show on aircraft ↗', tr: 'Uçakta yerini göster ↗' },
  { en: 'Show sensor on aircraft ↗', tr: 'Sensörü uçakta göster ↗' },
  { en: 'Boeing-first candidates → human review → verified catalog', tr: 'Boeing öncelikli adaylar → insan kontrolü → doğrulanmış katalog' },
  { en: 'CURATION WORKSPACE', tr: 'DOĞRULAMA ÇALIŞMA ALANI' },
  { en: 'Verified real hardware', tr: 'Doğrulanmış gerçek donanım' },
  { en: 'Auto-matched reference', tr: 'Otomatik eşleşen referans' },
  { en: 'Back', tr: 'Geri' },
  { en: 'Home', tr: 'Ana Sayfa' },
  { en: 'Open source', tr: 'Kaynağı aç' },
  { en: 'Last scan', tr: 'Son tarama' },
  { en: 'Latest developments', tr: 'Son gelişmeler' },
  { en: 'QUICK DIGEST', tr: 'HIZLI ÖZET' },
  { en: 'What matters in aerospace right now', tr: 'Şu anda havacılıkta öne çıkanlar' },
  { en: 'Results', tr: 'Sonuçlar' },
  { en: 'No matching equipment with these filters.', tr: 'Bu filtrelerle eşleşen ekipman yok.' },
  { en: 'Select a sensor.', tr: 'Bir sensör seç.' },
  { en: 'Aircraft systems / ATA atlas', tr: 'Uçak sistemleri / ATA atlası' },
  { en: 'Generic transport architecture · not type-specific', tr: 'Genel transport mimarisi · tipe özel değil' },
  { en: 'Generic transport sensor architecture', tr: 'Genel transport sensör mimarisi' },
  { en: 'SENSING / SIGNAL ARCHITECTURE', tr: 'ALGILAMA / SİNYAL MİMARİSİ' },
]

const textOriginal = new WeakMap<Node, string>()
const attrOriginal = new WeakMap<Element, Record<string, string>>()

function lookup(value: string, language: 'tr' | 'en') {
  const trimmed = value.trim()
  if (!trimmed) return value
  for (const item of DICTIONARY) {
    if (trimmed === item.en || trimmed === item.tr) {
      const target = language === 'tr' ? item.tr : item.en
      return value.replace(trimmed, target)
    }
  }
  return value
}

function translateAttributes(element: Element, language: 'tr' | 'en') {
  const attrs = ['placeholder', 'title', 'aria-label']
  const saved = attrOriginal.get(element) || {}
  let touched = false

  for (const attr of attrs) {
    const current = element.getAttribute(attr)
    if (current == null) continue
    if (!(attr in saved)) saved[attr] = current
    const base = saved[attr]
    const next = lookup(base, language)
    if (current !== next) element.setAttribute(attr, next)
    touched = true
  }

  if (touched) attrOriginal.set(element, saved)
}

function translateTree(root: Node, language: 'tr' | 'en') {
  if (root.nodeType === Node.TEXT_NODE) {
    const node = root
    const parent = node.parentElement
    if (!parent || parent.closest('script,style')) return
    if (!textOriginal.has(node)) textOriginal.set(node, node.nodeValue || '')
    const base = textOriginal.get(node) || ''
    const next = lookup(base, language)
    if (node.nodeValue !== next) node.nodeValue = next
    return
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root !== document.body) return

  if (root instanceof Element) translateAttributes(root, language)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent || parent.closest('script,style')) continue
      if (!textOriginal.has(node)) textOriginal.set(node, node.nodeValue || '')
      const base = textOriginal.get(node) || ''
      const next = lookup(base, language)
      if (node.nodeValue !== next) node.nodeValue = next
    } else if (node instanceof Element) {
      translateAttributes(node, language)
    }
  }
}

export default function UiTextTranslator() {
  const { language } = useUiLanguage()

  useEffect(() => {
    translateTree(document.body, language)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => translateTree(node, language))
        }
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateAttributes(mutation.target, language)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    })

    return () => observer.disconnect()
  }, [language])

  return null
}
