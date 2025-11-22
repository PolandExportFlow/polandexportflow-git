'use client'
import { useState } from 'react'

type ToCopyProps = {
  text: string
  label: string
  className?: string
  successLabel?: string
  title?: string
  copiedMs?: number
  onCopy?: (ok: boolean) => void
}

export default function ToCopy({
  text,
  label,
  className = '',
  successLabel = 'Copied to clipboard!',
  title = 'Click to copy',
  copiedMs = 1500,
  onCopy,
}: ToCopyProps) {
  const [copied, setCopied] = useState(false)

  const fallbackCopy = (val: string) => {
    const ta = document.createElement('textarea')
    ta.value = val
    ta.readOnly = true
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)

    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent)
    if (isIOS) {
      const range = document.createRange()
      range.selectNodeContents(ta)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      ta.setSelectionRange(0, ta.value.length)
    } else {
      ta.select()
    }

    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    window.getSelection()?.removeAllRanges()
    document.body.removeChild(ta)
    return ok
  }

  const copy = async (): Promise<void> => {
    let ok = false
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        ok = true
      }
    } catch { /* noop */ }
    if (!ok) ok = fallbackCopy(text)

    onCopy?.(ok)

    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), copiedMs)
    } else {
      console.error('Copy failed')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`cursor-pointer select-none hover:underline font-heebo_regular ${className}`}
      aria-live="polite"
      title={title}
    >
      {copied ? successLabel : label}
    </button>
  )
}
