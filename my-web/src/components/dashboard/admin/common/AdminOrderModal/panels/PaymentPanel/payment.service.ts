// src/components/dashboard/admin/common/AdminOrderModal/services/payment.service.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import { PaymentDataPayload } from '../../AdminOrderTypes'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const round2 = (n: number) => Math.round(n * 100) / 100

const ensureLookup = (v: string) => {
  const s = (v ?? '').trim()
  if (!s) throw new Error('Brak lookup (order_number).')
  return s
}

const ensureId = (v: string, context: string) => {
  const s = (v ?? '').trim()
  if (!s) throw new Error(`Brak ID (${context}).`)
  return s
}

export async function adminGetPaymentData(lookup: string): Promise<PaymentDataPayload> {
  try {
    const { data, error } = await supabase.rpc('admin_get_payment_data', {
      p_lookup: ensureLookup(lookup),
    })
    if (error) throw error
    return {
      payment: data?.payment ?? null,
      transactions: data?.transactions ?? [],
    }
  } catch (err) {
    logSbError('[payment.service.adminGetPaymentData]', err)
    return { payment: null, transactions: [] }
  }
}

export async function adminUpdatePaymentStatus(lookup: string, status: string) {
  try {
    const { error } = await supabase.rpc('admin_order_update_payment_status', {
      p_lookup: ensureLookup(lookup),
      p_status: status,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminUpdatePaymentStatus]', err)
    throw err
  }
}

export async function adminUpdateServiceFee(lookup: string, fee_pct: number) {
  try {
    const { error } = await supabase.rpc('admin_order_update_payment_service_fee', {
      p_lookup: ensureLookup(lookup),
      p_service_fee: fee_pct,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminUpdateServiceFee]', err)
    throw err
  }
}

export async function adminUpdatePaymentNote(lookup: string, note: string) {
  try {
    const { error } = await supabase.rpc('admin_order_update_payment_note', {
      p_lookup: ensureLookup(lookup),
      p_note: note,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminUpdatePaymentNote]', err)
    throw err
  }
}

export async function adminUpdateAdminData(lookup: string, costs: number, received: number) {
  try {
    const { error } = await supabase.rpc('admin_order_update_payment_admin_data', {
      p_lookup: ensureLookup(lookup),
      p_costs: costs,
      p_received: received,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminUpdateAdminData]', err)
    throw err
  }
}

export async function adminUpdateProductSplit(lookup: string, split_received: number, split_due: number) {
  try {
    const { error } = await supabase.rpc('admin_order_update_payment_products_split', {
      p_lookup: ensureLookup(lookup),
      p_split_received: split_received,
      p_split_due: split_due,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminUpdateProductSplit]', err)
    throw err
  }
}

export async function adminAddTransaction(payment_id: string, order_id: string, amount: number, note: string | null) {
  try {
    const { data, error } = await supabase.rpc('admin_order_payment_transaction_add', {
      p_payment_id: ensureId(payment_id, 'payment_id'),
      p_order_id: ensureId(order_id, 'order_id'),
      p_amount: amount,
      p_note: note,
    })
    if (error) throw error
    return data
  } catch (err) {
    logSbError('[payment.service.adminAddTransaction]', err)
    throw err
  }
}

export async function adminDeleteTransaction(transaction_uuid: string) {
  try {
    const { error } = await supabase.rpc('admin_order_payment_transaction_delete', {
      p_transaction_id: ensureId(transaction_uuid, 'transaction_id'),
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.service.adminDeleteTransaction]', err)
    throw err
  }
}

export async function adminFetchCurrencyRates(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase.from('admin_currency_rates').select('currency_code, currency_rate_in_pln')
    if (error) throw error

    const map: Record<string, number> = {}
    for (const row of data ?? []) {
      const code = String((row as any).currency_code || '').toUpperCase()
      const rate = Number((row as any).currency_rate_in_pln)
      if (code && Number.isFinite(rate) && rate > 0) map[code] = rate
    }
    if (!map.PLN) map.PLN = 1
    return map
  } catch (err) {
    logSbError('[payment.adminFetchCurrencyRates]', err)
    return { PLN: 1 }
  }
}

export async function adminFetchPaymentMethods(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('order_payment_methods')
      .select('payment_code, payment_method_name, payment_fee')
    if (error) throw error

    const map: Record<string, number> = {}
    for (const row of data ?? []) {
      const code = String((row as any).payment_code || '')
      const pct = Number((row as any).payment_fee)
      if (code) map[code] = Number.isFinite(pct) ? pct : 0
    }
    return map
  } catch (err) {
    logSbError('[payment.adminFetchPaymentMethods]', err)
    return {}
  }
}

export type AdminQuoteRowIn = {
  carrierKey: string
  carrierLabel: string
  pricePLN: number
  deliveryDays?: string
  note?: string
}

export async function adminFetchQuotesByOrderId(orderId: string) {
  try {
    const { data, error } = await supabase.rpc('admin_quote_list_by_order_id', { p_order_id: orderId })
    if (error) throw error
    return (data ?? []) as Array<{
      id: string
      carrier: string
      price: string | number
      delivery_days?: string | null
      note?: string | null
      created_at?: string
      expires_at?: string
    }>
  } catch (err) {
    logSbError('[payment.adminFetchQuotesByOrderId]', err)
    return []
  }
}

export async function adminCreateQuotesByOrderId(opts: {
  orderId: string
  rows: AdminQuoteRowIn[]
  validDays: number
}) {
  const payload = (opts.rows ?? []).map(r => ({
    carrierKey: r.carrierKey,
    carrierLabel: r.carrierLabel,
    pricePLN: isNum(r.pricePLN) ? round2(Math.max(0, r.pricePLN)) : 0,
    deliveryDays: r.deliveryDays ?? null,
    note: r.note ?? null,
  }))

  const days = Math.max(1, Math.min(60, Math.floor(opts.validDays || 14)))

  try {
    const { error } = await supabase.rpc('admin_quote_create_by_order_id', {
      p_order_id: opts.orderId,
      p_rows: payload,
      p_valid_days: days,
    })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.adminCreateQuotesByOrderId]', err)
    throw err
  }
}

export async function adminResolveOrderId(input: string) {
  try {
    const { data, error } = await supabase.rpc('admin_order_resolve_id', { p_input: (input ?? '').trim() })
    if (error) throw error
    return (data ?? null) as string | null
  } catch (err) {
    logSbError('[payment.adminResolveOrderId]', err)
    return null
  }
}

export async function adminDeleteQuoteById(quoteId: string) {
  try {
    const { error } = await supabase.rpc('admin_quote_delete_by_id', { p_quote_id: quoteId })
    if (error) throw error
  } catch (err) {
    logSbError('[payment.adminDeleteQuoteById]', err)
    throw err
  }
}