'use client'

import { useEffect } from 'react'

const MAP_SELECTOR = 'svg[aria-label="Zoomable Natural Earth projected global aviation accident map"]'

export default function MapWheelScrollGuard() {
  useEffect(() => {
    const blockPageScrollOverMap = (event: WheelEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!target.closest(MAP_SELECTOR)) return

      // The map's React wheel handler still receives the event and performs
      // the zoom. Cancelling the native default here prevents Chrome/Safari
      // from scrolling the page at the same time.
      event.preventDefault()
    }

    document.addEventListener('wheel', blockPageScrollOverMap, {
      capture: true,
      passive: false,
    })

    return () => {
      document.removeEventListener('wheel', blockPageScrollOverMap, { capture: true })
    }
  }, [])

  return null
}
