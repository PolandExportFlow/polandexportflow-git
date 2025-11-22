// messages/hooks/useAutoScrollOnAppend.ts
'use client'

import { useEffect, useRef } from 'react'

export function useAutoScrollOnAppend(
  containerRef: React.RefObject<HTMLElement>,
  listLength: number,
  justAppendedRef: React.MutableRefObject<boolean>,
  smooth: boolean = true
) {
  const prevLenRef = useRef(0)

  useEffect(() => {
    const appended = listLength > prevLenRef.current
    const needScroll = appended || justAppendedRef.current
    prevLenRef.current = listLength
    if (!needScroll) return

    const el = containerRef.current
    if (!el) { justAppendedRef.current = false; return }

    const doScroll = () => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      } catch {
        ;(el as any).scrollTop = el.scrollHeight
      }
      justAppendedRef.current = false
    }

    // pozwól layoutowi się przeliczyć (np. obrazki / fonty) — double rAF
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(doScroll)

      // w razie gdy obrazek doładuje się chwilę później — jednorazowy „doskok”
      const imgs = Array.from(el.querySelectorAll('img'))
      const onImgLoad = () => {
        // jeśli wciąż dopinamy się do dołu (np. seria wiadomości), dognij jeszcze raz
        if (!justAppendedRef.current) return
        doScroll()
      }
      imgs.forEach(img => img.addEventListener('load', onImgLoad, { once: true } as any))

      // cleanup
      const cleanup = () => imgs.forEach(img => img.removeEventListener('load', onImgLoad))
      // zdejmij nasłuch po ~1.2s, żeby nie trzymać eventów
      const t = setTimeout(cleanup, 1200)

      return () => { cancelAnimationFrame(raf2); clearTimeout(t); cleanup() }
    })

    return () => cancelAnimationFrame(raf1)
  }, [listLength, containerRef, justAppendedRef, smooth])
}
