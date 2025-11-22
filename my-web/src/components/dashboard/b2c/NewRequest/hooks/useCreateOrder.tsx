// hooks/useCreateOrder.ts
'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type { CreateOrderArgs, CreateOrderResult } from '../requestTypes'

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const toQty = (v: any): number => {
  const raw = String(v ?? '').replace(/[^\d]/g, '')
  const n = raw === '' ? 1 : parseInt(raw, 10) || 1
  return Math.max(1, n)
}

export function useCreateOrder() {
  const [isLoading, setLoading] = useState(false)
  const [error, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<CreateOrderResult | null>(null)

  const createOrder = async (args: CreateOrderArgs) => {
    setLoading(true)
    setErr(null)
    setResult(null)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Musisz być zalogowany, aby utworzyć zamówienie.')
      }

      const p_items = (args.items || []).map(it => ({
        item_name: (it.item_name ?? '').trim(),
        item_url: it.item_url ? String(it.item_url).trim() : null,
        item_note: it.item_note ? String(it.item_note).trim() : null,
        item_quantity: toQty(it.item_quantity),
        item_value: toNum(it.item_value) ?? 0,
        item_weight: toNum(it.item_weight),
        item_length: toNum(it.item_length),
        item_width: toNum(it.item_width),
        item_height: toNum(it.item_height),
      }))

      const { data, error: rpcError } = await supabase.rpc('user_order_create', {
        p_service: args.service,
        p_address: args.address,
        p_items,
        p_order_note: args.order_note ?? null,
      })

      if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw new Error(`Błąd tworzenia zamówienia: ${rpcError.message}`)
      }

      if (!data) throw new Error('Baza danych nie zwróciła potwierdzenia zamówienia.')

      const created = data as CreateOrderResult

      if (!created.order_id || !created.order_number) {
        throw new Error('Otrzymano nieprawidłowe dane zamówienia z bazy.')
      }

      if (!Array.isArray(created.items) || created.items.length !== p_items.length) {
        console.warn('Liczba utworzonych przedmiotów różni się od wysłanych. Sprawdź logikę SQL.')
      }

      setResult(created)
      return created
    } catch (e: any) {
      const msg = e?.message || String(e)
      setErr(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { createOrder, isLoading, error, result }
}
