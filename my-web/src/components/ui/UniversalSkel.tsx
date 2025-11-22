'use client'

import React from 'react'

type Props = {
  h?: number
  className?: string
}

export default function UniversalSkel({ h = 200, className = '' }: Props) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-middle-blue/10 border border-light-blue ${className}`}
      style={{ height: h }}
    />
  )
}
