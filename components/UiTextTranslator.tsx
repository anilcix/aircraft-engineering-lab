'use client'

import { useEffect } from 'react'
import { useUiLanguage } from '@/components/UiLanguage'

const PAIRS: Array<[string, string]> = [
  ['Equipment & Systems', 'Ekipman & Sistemler'],
  ['Sensors', 'Sensörler'],
  ['Image Curator', 'Görsel Doğrulama'],
  ['Aircraft Types', 'Uçak Tipleri'],
  ['Certification', 'Sertifikasyon'],
  ['Selected Component', 'Seçili Parça'],
  ['Equipment List', 'Ekipman Listesi'],
  ['Ekipman Listesi', 'Equipment List'],
  ['Sensor List', 'Sensör Listesi'],
  ['Sensör Listesi', 'Sensor List'],
  ['All', 'Tümü'],
  ['Tümü', 'All'],
  ['Search', 'Ara'],
  ['Ara', 'Search'],
  ['Purpose', 'Amaç'],
  ['AMAÇ', 'PURPOSE'],
  ['Region', 'Bölge'],
  ['BÖLGE', 'REGION'],
  ['What does it measure?', 'Ne ölçer?'],
  ['NE ÖLÇER?', 'WHAT DOES IT MEASURE?'],
  ['Sensor principle', 'Sensör prensibi'],
  ['SENSÖR PRENSİBİ', 'SENSOR PRINCIPLE'],
  ['Signal', 'Sinyal'],
  ['SİNYAL', 'SIGNAL'],
  ['Physical connection', 'Fiziksel bağlantı'],
  ['FİZİKSEL BAĞLANTI', 'PHYSICAL CONNECTION'],
  ['Redundancy', 'Yedeklilik'],
  ['FAILURE EFFECT', 'ARIZA ETKİSİ'],
  ['Failure effect', 'Arıza etkisi'],
  ['Open source', 'Kaynağı aç'],
  ['Kaynağı aç', 'Open source'],
  ['Back', 'Geri'],
  ['Geri', 'Back'],
]

function translateExact(text: string, toEnglish: boolean) {
  const trimmed = text.trim()
  if (!trimmed) return text
  for (const [a, b] of PAIRS) {
    const source = toEnglish ? b : a
    const target = toEnglish ? a : b
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
        const next = translateExact(value, language === 'en')
        if (next !== value) node.nodeValue = next
      }
    }
    apply()
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => apply(node))
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  return null
}
