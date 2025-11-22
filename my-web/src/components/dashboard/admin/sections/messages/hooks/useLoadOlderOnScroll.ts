// messages/hooks/useLoadOlderOnScroll.ts
'use client'

import { useEffect } from 'react'

/**
 * Wywołuje loadOlder() gdy user jest blisko góry.
 * Bez kotwiczenia (tym zajmuje się ChatView).
 * Startuje dopiero po pierwszej interakcji (wheel/touch).
 */
export function useLoadOlderOnScroll(
  containerRef: React.RefObject<HTMLElement>,
  loadOlder: () => void | Promise<void>,
  threshold = 64
) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let interacted = false
    const markInteracted = () => { interacted = true }

    let loading = false
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(async () => {
        try {
          if (!interacted) return
          if (loading) return
          if (el.scrollHeight <= el.clientHeight + 4) return
          if (el.scrollTop > threshold) return

          loading = true
          await Promise.resolve(loadOlder())
        } finally {
          loading = false
          ticking = false
        }
      })
    }

    el.addEventListener('wheel', markInteracted, { passive: true })
    el.addEventListener('touchstart', markInteracted, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', markInteracted)
      el.removeEventListener('touchstart', markInteracted)
    }
  }, [containerRef, loadOlder, threshold])
}
