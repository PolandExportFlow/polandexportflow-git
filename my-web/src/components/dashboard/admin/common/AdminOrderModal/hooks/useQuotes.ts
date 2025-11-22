'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ShippingQuote } from '../AdminOrderTypes'
import {
  adminCreateQuotesByOrderId,
  adminFetchQuotesByOrderId,
  adminResolveOrderId,
  adminDeleteQuoteById,
  type AdminQuoteRowIn,
} from '../panels/PaymentPanel/payment.service'

type State = { loading: boolean; refreshing: boolean; quotes: ShippingQuote[] }

// UUID v1–v5
const isUuid = (s?: string | null): s is string =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

export function useQuotes(orderIdOrNumber: unknown) {
  const [state, setState] = useState<State>({ loading: true, refreshing: false, quotes: [] })
  const [effectiveId, setEffectiveId] = useState<string | null>(null)

  // guard przed setState po unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  const safeSet = useCallback((patch: Partial<State>) => {
    if (mountedRef.current) setState(prev => ({ ...prev, ...patch }))
  }, [])

  // PEF → UUID (albo użycie UUID bezpośrednio)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const input = String(orderIdOrNumber ?? '').trim()
      if (!input) {
        setEffectiveId(null)
        return
      }
      if (isUuid(input)) {
        setEffectiveId(input)
        return
      }

      try {
        const id = await adminResolveOrderId(input)
        if (!cancelled) setEffectiveId(id ?? null)
      } catch (e) {
        console.error('[useQuotes] resolve order id error:', e)
        if (!cancelled) setEffectiveId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderIdOrNumber])

  const fetchOnce = useCallback(async () => {
    if (!effectiveId) {
      safeSet({ loading: false, refreshing: false, quotes: [] })
      return
    }
    safeSet({ loading: true })
    try {
      // 1. Pobieramy dane w "złym" formacie (z polami `carrier` i `price`)
      const rows = await adminFetchQuotesByOrderId(effectiveId)

      // 2. ⭐️ POPRAWKA: Mapujemy dane na poprawny typ `ShippingQuote` ⭐️
      const normalizedQuotes: ShippingQuote[] = rows.map(row => ({
        id: row.id,
        quote_carrier: row.carrier, // Tłumaczymy `carrier` na `quote_carrier`
        quote_carrier_fee: row.price, // Tłumaczymy `price` na `quote_carrier_fee`
        quote_delivery_days: row.delivery_days,
        quote_note: row.note,
        quote_created_at: row.created_at,
        quote_expires_at: row.expires_at,
        
        // Dodajemy te pola jako `undefined`, aby pasowały do typu.
        // Prawdopodobnie Twoja funkcja RPC `admin_quote_list_by_order_id`
        // powinna również zwracać `quote_status` i `is_selected`.
        quote_status: (row as any).quote_status, 
        is_selected: (row as any).is_selected,
      }))
      
      // 3. Zapisujemy do stanu już poprawne dane
      safeSet({ loading: false, refreshing: false, quotes: normalizedQuotes })
      
    } catch (e) {
      console.error('[useQuotes] fetchOnce error:', e)
      safeSet({ loading: false })
    }
  }, [effectiveId, safeSet])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  const refresh = useCallback(async () => {
    if (!effectiveId) return
    safeSet({ refreshing: true })
    try {
      await fetchOnce()
    } finally {
      safeSet({ refreshing: false })
    }
  }, [effectiveId, fetchOnce, safeSet])

  const createQuotes = useCallback(
    async (rows: AdminQuoteRowIn[], validDays: number, overrideId?: string) => {
      const idToUse =
        overrideId && isUuid(overrideId) ? overrideId : effectiveId && isUuid(effectiveId) ? effectiveId : null

      if (!idToUse) {
        console.warn('[useQuotes] createQuotes: invalid orderId', {
          hookEffectiveId: effectiveId,
          override: overrideId,
        })
        return
      }

      try {
        await adminCreateQuotesByOrderId({ orderId: idToUse, rows, validDays })
        await refresh()
      } catch (e) {
        console.error('[useQuotes] createQuotes error:', e)
      }
    },
    [effectiveId, refresh]
  )

  const removeQuote = useCallback(
    async (quoteId: string) => {
      try {
        await adminDeleteQuoteById(quoteId)
        await refresh()
      } catch (e) {
        console.error('[useQuotes] removeQuote error:', e)
      }
    },
    [refresh]
  )

  const lastQuoteAt = useMemo(() => {
    const dates = state.quotes
      .map(q => (q as any).created_at || (q as any).createdAt || (q as any).expires_at)
      .filter(Boolean)
      .map(d => +new Date(d as any))
      .filter(Number.isFinite)
    return dates.length ? new Date(Math.max(...dates)) : null
  }, [state.quotes])

  return {
    loading: state.loading,
    refreshing: state.refreshing,
    quotes: state.quotes,
    lastQuoteAt,
    refresh,
    createQuotes,
    removeQuote,
  }
}

export type UseQuotesReturn = ReturnType<typeof useQuotes>