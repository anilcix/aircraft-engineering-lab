'use client'

import { useEffect } from 'react'

const MAP_SELECTOR = 'svg[aria-label="Zoomable Natural Earth projected global aviation accident map"]'

type LockedStyle = {
  element: HTMLElement
  overflow: string
  overflowY: string
  overscrollBehavior: string
}

export default function MapWheelScrollGuard() {
  useEffect(() => {
    let lockedFor: SVGSVGElement | null = null
    let lockedStyles: LockedStyle[] = []

    const findMapAt = (clientX: number, clientY: number) => {
      const maps = document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR)
      return Array.from(maps).find((map) => {
        const rect = map.getBoundingClientRect()
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
      }) || null
    }

    const restoreScroll = () => {
      for (const saved of lockedStyles) {
        saved.element.style.overflow = saved.overflow
        saved.element.style.overflowY = saved.overflowY
        saved.element.style.overscrollBehavior = saved.overscrollBehavior
      }
      lockedStyles = []
      lockedFor = null
    }

    const lockElement = (element: HTMLElement) => {
      if (lockedStyles.some((saved) => saved.element === element)) return
      lockedStyles.push({
        element,
        overflow: element.style.overflow,
        overflowY: element.style.overflowY,
        overscrollBehavior: element.style.overscrollBehavior,
      })
      element.style.overflowY = 'hidden'
      element.style.overscrollBehavior = 'none'
    }

    const lockScrollForMap = (map: SVGSVGElement) => {
      if (lockedFor === map) return
      restoreScroll()
      lockedFor = map

      // The accident drawer itself is scrollable, so blocking only body/html is
      // not enough. Lock every scrollable ancestor of the map while the pointer
      // is inside the map area, then restore the exact inline styles on exit.
      let node: HTMLElement | null = map.parentElement
      while (node) {
        const computed = window.getComputedStyle(node)
        const overflowY = computed.overflowY
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
          lockElement(node)
        }
        node = node.parentElement
      }

      lockElement(document.documentElement)
      lockElement(document.body)
    }

    const syncPointerLock = (event: PointerEvent) => {
      const map = findMapAt(event.clientX, event.clientY)
      if (map) lockScrollForMap(map)
      else restoreScroll()
    }

    const blockWheel = (event: WheelEvent) => {
      const map = findMapAt(event.clientX, event.clientY)
      if (!map) {
        restoreScroll()
        return
      }

      lockScrollForMap(map)
      event.preventDefault()
    }

    window.addEventListener('pointermove', syncPointerLock, { capture: true, passive: true })
    window.addEventListener('wheel', blockWheel, { capture: true, passive: false })

    return () => {
      restoreScroll()
      window.removeEventListener('pointermove', syncPointerLock, { capture: true })
      window.removeEventListener('wheel', blockWheel, { capture: true })
    }
  }, [])

  return null
}
