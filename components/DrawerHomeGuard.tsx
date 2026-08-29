'use client'

import { useEffect, useState } from 'react'
import { useUiLanguage } from '@/components/UiLanguage'

export default function DrawerHomeGuard() {
  const { tr } = useUiLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(Boolean(document.querySelector('.info-drawer.open')))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true })
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  const goHome = () => {
    const close = document.querySelector<HTMLButtonElement>('.info-drawer.open .drawer-close')
    close?.click()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <button className="drawer-home-global" onClick={goHome}>← {tr ? 'Ana Sayfa' : 'Home'}</button>
}
