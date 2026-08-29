'use client'

import { useEffect } from 'react'

const MAP_SELECTOR = 'svg[aria-label="Zoomable Natural Earth projected global aviation accident map"]'
const DRAWER_SELECTOR = '.info-drawer.open'

export default function MapWheelScrollGuard() {
  useEffect(() => {
    const attached = new WeakSet<SVGSVGElement>()
    let bodyScrollY = 0
    let bodyLocked = false

    const consumeMapWheel = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault()
    }

    const attachToMaps = () => {
      document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR).forEach((map) => {
        if (attached.has(map)) return
        attached.add(map)
        map.style.overscrollBehavior = 'none'
        map.addEventListener('wheel', consumeMapWheel, { capture: true, passive: false })
      })
    }

    const findMapAt = (clientX: number, clientY: number) => {
      const maps = document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR)
      return Array.from(maps).find((map) => {
        const rect = map.getBoundingClientRect()
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
      }) || null
    }

    const syncBodyLock = () => {
      const drawerOpen = Boolean(document.querySelector(DRAWER_SELECTOR))
      if (drawerOpen && !bodyLocked) {
        bodyLocked = true
        bodyScrollY = window.scrollY
        document.documentElement.classList.add('ael-drawer-open')
        document.body.classList.add('ael-drawer-open')
        document.body.style.position = 'fixed'
        document.body.style.top = `-${bodyScrollY}px`
        document.body.style.left = '0'
        document.body.style.right = '0'
        document.body.style.width = '100%'
      } else if (!drawerOpen && bodyLocked) {
        bodyLocked = false
        document.documentElement.classList.remove('ael-drawer-open')
        document.body.classList.remove('ael-drawer-open')
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.width = ''
        window.scrollTo(0, bodyScrollY)
      }
    }

    const blockScrollChaining = (event: WheelEvent) => {
      if (findMapAt(event.clientX, event.clientY)) {
        if (event.cancelable) event.preventDefault()
        return
      }

      const drawer = document.querySelector<HTMLElement>(DRAWER_SELECTOR)
      if (!drawer) return
      const target = event.target as Node | null

      // Wheel gestures outside the active module must never reach the page behind it.
      if (!target || !drawer.contains(target)) {
        if (event.cancelable) event.preventDefault()
        return
      }

      // Inside the drawer, allow its own scrollable region to consume the gesture.
      // CSS overscroll-behavior prevents the gesture remainder from chaining to body.
    }

    const blockBackgroundTouch = (event: TouchEvent) => {
      const drawer = document.querySelector<HTMLElement>(DRAWER_SELECTOR)
      if (!drawer) return
      const target = event.target as Node | null
      if (!target || !drawer.contains(target)) {
        if (event.cancelable) event.preventDefault()
      }
    }

    attachToMaps()
    syncBodyLock()

    const observer = new MutationObserver(() => {
      attachToMaps()
      syncBodyLock()
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })

    window.addEventListener('wheel', blockScrollChaining, { capture: true, passive: false })
    window.addEventListener('touchmove', blockBackgroundTouch, { capture: true, passive: false })

    return () => {
      observer.disconnect()
      window.removeEventListener('wheel', blockScrollChaining, { capture: true })
      window.removeEventListener('touchmove', blockBackgroundTouch, { capture: true })
      document.querySelectorAll<SVGSVGElement>(MAP_SELECTOR).forEach((map) => {
        map.removeEventListener('wheel', consumeMapWheel, { capture: true })
      })
      if (bodyLocked) {
        document.documentElement.classList.remove('ael-drawer-open')
        document.body.classList.remove('ael-drawer-open')
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.width = ''
        window.scrollTo(0, bodyScrollY)
      }
    }
  }, [])

  return null
}
