'use client'

import { useEffect } from 'react'

const MAP_SELECTOR = 'svg[aria-label="Zoomable Natural Earth projected global aviation accident map"]'

export default function MapWheelScrollGuard() {
  useEffect(() => {
    const attached = new WeakSet<SVGSVGElement>()

    // Important: Chrome/Safari can hand the remainder of a wheel gesture to a
    // parent scroller once the map reaches its minimum zoom. Registering an
    // active listener on the SVG itself makes the wheel sequence cancellable at
    // the actual interaction surface. We only cancel the browser default; the
    // event still propagates to React's onWheel handler, so map zoom keeps working.
    const consumeMapWheel = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault()
    }

    const attachToMaps = () => {
      document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR).forEach((map) => {
        if (attached.has(map)) return
        attached.add(map)
        map.style.overscrollBehavior = 'none'
        map.addEventListener('wheel', consumeMapWheel, {
          capture: true,
          passive: false,
        })
      })
    }

    const findMapAt = (clientX: number, clientY: number) => {
      const maps = document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR)
      return Array.from(maps).find((map) => {
        const rect = map.getBoundingClientRect()
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
      }) || null
    }

    // Fallback for overlay pixels above the SVG (legend / zoom controls). This
    // also consumes wheel at 100% zoom so no residual delta reaches the drawer
    // or page scroll container.
    const blockScrollChaining = (event: WheelEvent) => {
      if (!findMapAt(event.clientX, event.clientY)) return
      if (event.cancelable) event.preventDefault()
    }

    attachToMaps()

    const observer = new MutationObserver(attachToMaps)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('wheel', blockScrollChaining, {
      capture: true,
      passive: false,
    })

    return () => {
      observer.disconnect()
      window.removeEventListener('wheel', blockScrollChaining, { capture: true })
      document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR).forEach((map) => {
        map.removeEventListener('wheel', consumeMapWheel, { capture: true })
      })
    }
  }, [])

  return null
}
