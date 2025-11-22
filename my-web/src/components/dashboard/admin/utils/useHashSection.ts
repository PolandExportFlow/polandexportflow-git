// utils/useHashSection.ts
'use client'
import { useEffect, useState } from 'react'

export function useHashSection(defaultId: string) {
  const read = () =>
    typeof window === 'undefined'
      ? defaultId
      : (window.location.hash?.replace(/^#/, '') || defaultId)

  const [section, setSection] = useState<string>(read)

  useEffect(() => {
    const onHash = () => setSection(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return section
}
