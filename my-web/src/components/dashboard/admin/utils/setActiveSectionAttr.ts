// utils/setActiveSectionAttr.ts
'use client'

export function attachActiveSectionAttr(defaultId = 'dashboard') {
  const set = () => {
    const id = (window.location.hash?.slice(1) || defaultId).toLowerCase()
    document.documentElement.setAttribute('data-section', id)
  }
  set()
  window.addEventListener('hashchange', set)
  return () => window.removeEventListener('hashchange', set)
}
