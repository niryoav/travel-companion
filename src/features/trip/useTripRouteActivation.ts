import { useLayoutEffect } from 'react'

function tripScrollRoot(): Element {
  return document.scrollingElement ?? document.documentElement
}

function resetTripScrollPosition(scrollRoot: Element) {
  if (scrollRoot.scrollTop !== 0) {
    scrollRoot.scrollTop = 0
  }
}

/**
 * Trip opens at the top. Reset before paint, then verify once after WebKit has
 * resolved the newly mounted route's scroll height. This prevents a stale
 * document offset from leaving the Trip foreground outside the scrollport
 * until the first user gesture.
 */
export function useTripRouteActivation() {
  useLayoutEffect(() => {
    const scrollRoot = tripScrollRoot()

    resetTripScrollPosition(scrollRoot)
    const frame = window.requestAnimationFrame(() => {
      void scrollRoot.clientHeight
      resetTripScrollPosition(scrollRoot)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])
}
