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
  { en: 'High criticality', tr: 'Yüksek kritiklik' },
  { en: 'Medium criticality', tr: 'Orta kritiklik' },
  { en: 'Low criticality', tr: 'Düşük kritiklik' },
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
]

function translateExact(text: string, language: 'tr' | 'en') {
  const trimmed = text.trim()
  if (!trimmed) return text
  for (const item of DICTIONARY) {
    const source = language === 'tr' ? item.en : item.tr
    const target = language === 'tr' ? item.tr : item.en
    if (trimmed === source) return text.replace(trimmed, target)
  }
  return text
}

export default function UiTextTranslator() {
  const { language } = useUiLanguage()

  useEffect(() => {
    const apply = (root: Node = document.body) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const parent = node.parentElement
        if (!parent || parent.closest('script,style')) continue
        const value = node.nodeValue || ''
        const next = translateExact(value, language)
        if (next !== value) node.nodeValue = next
      }
    }

    apply()
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) mutation.addedNodes.forEach((node) => apply(node))
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  return null
}
