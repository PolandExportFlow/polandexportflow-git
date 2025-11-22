'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'

type RatesMap = Record<string, number>
type DbRate = { currency_code: string; currency_rate_in_pln: number | null }

const EDITABLE = ['USD', 'EUR', 'GBP'] as const
const EDITABLE_ARR: string[] = [...EDITABLE]

export const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: '₣',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
}

function useDebounced<T extends (...args: any[]) => void>(fn: T, ms = 500) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

export function useCurrencyRates() {
  /* ---------------- REAL (NBP) ---------------- */
  const [real, setReal] = useState<RatesMap | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loadingReal, setLoadingReal] = useState<boolean>(true)
  const [errorReal, setErrorReal] = useState<string | null>(null)
  const lastFetchTs = useRef<number>(0)

  const fetchReal = useCallback(async () => {
    setLoadingReal(true)
    setErrorReal(null)
    try {
      const r = await fetch(`/api/fx?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) throw new Error(`Bad content-type: ${ct}`)
      const json = await r.json()
      if (!r.ok || !json?.rates) throw new Error(json?.error || 'Invalid payload')
      setReal(json.rates as RatesMap)
      setUpdatedAt(json.updated ?? null)
      lastFetchTs.current = Date.now()
    } catch (e: any) {
      setErrorReal(e?.message ?? 'Fetch failed')
      logSbError('[useCurrencyRates.fetchReal]', e)
    } finally {
      setLoadingReal(false)
    }
  }, [])

  useEffect(() => {
    fetchReal()
    const id = setInterval(fetchReal, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastFetchTs.current > 5 * 60 * 1000) fetchReal()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchReal])

  /* ---------------- ADMIN (DB) ---------------- */
  const [admin, setAdmin] = useState<Record<string, number | null>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedOk, setSavedOk] = useState<Record<string, boolean>>({})
  const [errorAdmin, setErrorAdmin] = useState<string | null>(null)
  const booted = useRef(false)

  // Pomocnicze: wstaw brakujące wiersze z wartością startową (NBP lub 0.01)
  const ensureRows = useCallback(
    async (nbpRates: RatesMap | null) => {
      try {
        const { data: rows, error: selErr } = await supabase
          .from('admin_currency_rates')
          .select('currency_code')
          .in('currency_code', EDITABLE_ARR)
        if (selErr) throw selErr

        const existing = new Set((rows ?? []).map(r => r.currency_code))
        const toInsert = EDITABLE_ARR
          .filter(c => !existing.has(c))
          .map(c => ({
            currency_code: c,
            // jeśli mamy kurs z NBP – użyj go; inaczej minimalna dodatnia wartość
            currency_rate_in_pln: nbpRates?.[c] && Number.isFinite(nbpRates[c]) ? nbpRates[c] : 0.01,
          }))

        if (toInsert.length) {
          const { error: insErr } = await supabase.from('admin_currency_rates').insert(toInsert)
          if (insErr) throw insErr
        }
      } catch (e) {
        logSbError('[useCurrencyRates.ensureRows]', e)
        // nie propagujemy – widget i tak zadziała, tylko nie będzie rekordu do edycji
      }
    },
    []
  )

  useEffect(() => {
    if (booted.current) return
    booted.current = true

    ;(async () => {
      try {
        // Najpierw wstaw brakujące (używamy już dostępnych kursów NBP, jeśli są)
        await ensureRows(real)

        // Potem wczytaj wartości do stanu
        const { data, error } = await supabase
          .from('admin_currency_rates')
          .select('*')
          .in('currency_code', EDITABLE_ARR)

        if (error) throw error

        const map: Record<string, number | null> = {}
        ;(data as DbRate[]).forEach(r => {
          // Supabase potrafi zwrócić numeric jako string – normalizujemy
          const v =
            r.currency_rate_in_pln === null
              ? null
              : typeof r.currency_rate_in_pln === 'number'
              ? r.currency_rate_in_pln
              : Number(r.currency_rate_in_pln)
          map[r.currency_code] = Number.isFinite(v as number) ? (v as number) : null
        })
        setAdmin(map)
      } catch (e: any) {
        setErrorAdmin(e?.message ?? 'Init failed')
        logSbError('[useCurrencyRates.initAdmin]', e)
      }
    })()

    // realtime
    const ch = supabase
      .channel('admin_currency_rates_changes_editable')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_currency_rates' },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as DbRate
            if (row?.currency_code && EDITABLE_ARR.includes(row.currency_code)) {
              const v =
                row.currency_rate_in_pln === null
                  ? null
                  : typeof row.currency_rate_in_pln === 'number'
                  ? row.currency_rate_in_pln
                  : Number(row.currency_rate_in_pln)
              setAdmin(prev => ({ ...prev, [row.currency_code]: Number.isFinite(v as number) ? (v as number) : null }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [ensureRows, real])

  const saveRate = useCallback(async (code: string, rate: number | null) => {
    setSaving(s => ({ ...s, [code]: true }))
    setSavedOk(s => ({ ...s, [code]: false }))
    try {
      // zabezpieczenie przed NOT NULL – jeśli w DB nie zmienisz schematu
      const payload = {
        currency_code: code,
        currency_rate_in_pln: rate === null || rate <= 0 ? 0.01 : rate,
      }
      const { error } = await supabase
        .from('admin_currency_rates')
        .upsert(payload, { onConflict: 'currency_code' })
      if (error) throw error
      setSavedOk(s => ({ ...s, [code]: true }))
      setTimeout(() => setSavedOk(s => ({ ...s, [code]: false })), 3000)
    } catch (e: any) {
      setErrorAdmin(e?.message ?? 'Save failed')
      logSbError('[useCurrencyRates.saveRate]', e)
    } finally {
      setSaving(s => ({ ...s, [code]: false }))
    }
  }, [])

  const debouncedSave = useDebounced(saveRate, 500)

  const setLocalRate = (code: string, next: number | null, autosave = true) => {
    setAdmin(prev => ({ ...prev, [code]: next }))
    if (autosave) debouncedSave(code, next)
  }

  const list = useMemo(
    () =>
      EDITABLE_ARR.map(code => ({
        code,
        real: real?.[code] ?? null,
        custom: admin[code] ?? null,
        saving: !!saving[code],
        savedOk: !!savedOk[code],
      })),
    [real, admin, saving, savedOk]
  )

  const fmt2 = useMemo(
    () => new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 3 }),
    []
  )

  return {
    list,
    fmt2,
    loadingReal,
    errorReal,
    errorAdmin,
    updatedAt,
    setLocalRate,
    refresh: fetchReal,
  }
}
