// app/admin/components/sections/orders/panels/StatusPanel/AdditionalInfo.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'

type Props = {
  initialNote?: string
  onSave?: (note: string) => Promise<void> | void
  onRefresh?: () => Promise<void> | void
}

export default function AdditionalInfo({ initialNote = '', onSave, onRefresh }: Props) {
  const [note, setNote] = useState(initialNote || '')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    const next = initialNote || ''
    // Aktualizuj stan tylko jeśli się różni, aby nie tracić draftu
    setNote(prev => (prev === next ? prev : next))
  }, [initialNote])

  const saveIfChanged = useCallback(async () => {
    const curr = (note || '').trim()
    const base = (initialNote || '').trim()
    if (curr === base || !onSave) return
    try {
      setSaving('saving')
      await onSave(curr)
      setSaving('saved')
      setTimeout(() => setSaving('idle'), 1000)
      await onRefresh?.() // Odśwież nadrzędny komponent (np. po datę modyfikacji)
    } catch {
      setSaving('error')
      setTimeout(() => setSaving('idle'), 1200)
    }
  }, [note, initialNote, onSave, onRefresh])

  return (
    <div className='mt-6 bg-ds-light-blue rounded-md p-4'>
      <div className='mb-2 flex items-center justify-between'>
        <label className='text-[13px] opacity-70'>Dodatkowe informacje (zapis przy utracie fokusu)</label>
        <div className='text-[12px] text-middle-blue/70 h-4'>
          {saving === 'saving' && 'Zapisywanie…'}
          {saving === 'saved' && 'Zapisano.'}
          {saving === 'error' && 'Błąd zapisu.'}
        </div>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={() => void saveIfChanged()} // ⭐️ Zapis przy utracie fokusu
        placeholder='Notatka od klienta / Twoje informacje dla klienta…'
        className='w-full rounded-lg p-5 text-[14px] leading-relaxed outline-none min-h-[88px] border border-middle-blue/20 focus:border-middle-blue/50'
        rows={4}
      />
    </div>
  )
}