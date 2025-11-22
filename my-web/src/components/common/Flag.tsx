'use client'

import React from 'react'
import ReactCountryFlag from 'react-country-flag'

type Props = {
  iso?: string | null      
  title?: string             
  size?: number           
  className?: string
}

export default function Flag({ iso, title = '', size = 18, className }: Props) {
  const code = (iso ?? '').toUpperCase()
  if (!code || code.length !== 2) {
    return <span className={className} style={{ opacity: 0.6 }}>-</span>
  }
  const height = Math.round((size * 14) / 18)
  return (
    <ReactCountryFlag
      countryCode={code}
      svg
      style={{ width: size, height, borderRadius: 2, display: 'inline-block' }}
      title={title}
      aria-label={title}
      className={className}
    />
  )
}
