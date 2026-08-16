'use client'

import { useEffect } from 'react'

const MAP_SELECTOR = 'svg[aria-label="Zoomable Natural Earth projected global aviation accident map"]'

export default function MapWheelScrollGuard() {
  useEffect(() => {
    const blockPageScrollOverMap = (event: WheelEvent) => {
      const maps = document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR)
      if (!maps.length) return

      const overMap = Array.from(maps).some((map) => {
        const rect = map.getBoundingClientRect()
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
      })

      if (!overMap) return

      // Use an active native wheel listener at window capture level so Chrome/Safari
      // cannot hand the same gesture to the page/drawer scroll container. We check
      // pointer coordinates rather than event.target because map overlays can sit
      // above the SVG and otherwise let the wheel event escape.
      event.preventDefault()
    }

    window.addEventListener('wheel', blockPageScrollOverMap, {
      capture: true,
      passive: false,
    })

    return () => {
      window.removeEventListener('wheel', blockPageScrollOverMap, { capture: true })
    }
  }, [])

  return null
}
