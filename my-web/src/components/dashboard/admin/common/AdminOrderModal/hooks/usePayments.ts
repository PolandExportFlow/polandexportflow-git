// app/admin/components/sections/orders/hooks/usePayments.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OrderPayment, OrderPaymentTransaction } from '../AdminOrderTypes'
import {
  adminGetPaymentData,
  adminFetchCurrencyRates,
  adminUpdatePaymentStatus,
  adminUpdateServiceFee,
  adminUpdatePaymentNote,
  adminUpdateAdminData,
  adminUpdateProductSplit,
  adminAddTransaction,
  adminDeleteTransaction,
} from '../panels/PaymentPanel/payment.service'
import { toast } from 'sonner'

type State = {
  loading: boolean
  refreshing: boolean
  payment: OrderPayment | null
  transactions: OrderPaymentTransaction[]
  fxRates: Record<string, number>
  error?: string | null
}

const parseNum = (v: unknown) => {
  if (v === null || v === undefined) return 0
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const round2 = (n: number) => Math.round(n * 100) / 100

export function usePayments(orderLookup: string) {
  const [s, setS] = useState<State>({
    loading: true,
    refreshing: false,
    payment: null,
    transactions: [],
    fxRates: { PLN: 1 },
    error: null,
  })

  const hasLookup = !!(orderLookup && orderLookup.trim().length > 0)

  const aliveRef = useRef(true)
  const fetchSeq = useRef(0)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const safeSet = useCallback((updater: (prev: State) => State) => {
    if (!aliveRef.current) return
    setS(updater)
  }, [])

  const resetState = useCallback(() => {
    safeSet(() => ({
      loading: false,
      refreshing: false,
      payment: null,
      transactions: [],
      fxRates: { PLN: 1 },
      error: null,
    }))
  }, [safeSet])

  const fetchOnce = useCallback(async () => {
    const seq = ++fetchSeq.current
    if (!hasLookup) {
      resetState()
      return
    }

    safeSet(prev => ({ ...prev, loading: true, error: null }))
    try {
      const [payload, rates] = await Promise.all([
        adminGetPaymentData(orderLookup), // ⭐️ Poprawna nazwa funkcji
        adminFetchCurrencyRates().catch(() => ({ PLN: 1 } as Record<string, number>)),
      ])
      if (seq !== fetchSeq.current || !aliveRef.current) return

      safeSet(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        payment: payload.payment ?? null,
        transactions: payload.transactions ?? [],
        fxRates: rates && typeof rates === 'object' ? rates : { PLN: 1 },
        error: null,
      }))
    } catch (e: any) {
      if (seq !== fetchSeq.current || !aliveRef.current) return
      console.error('[usePayments] fetchOnce error:', e)
      safeSet(prev => ({ ...prev, loading: false, refreshing: false, error: e?.message ?? 'Fetch error' }))
    }
  }, [hasLookup, orderLookup, resetState, safeSet])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  const refresh = useCallback(async () => {
    if (!hasLookup) {
      safeSet(p => ({ ...p, refreshing: false }))
      return
    }
    safeSet(p => ({ ...p, refreshing: true }))
    try {
      await fetchOnce()
    } finally {
      safeSet(p => ({ ...p, refreshing: false }))
    }
  }, [hasLookup, fetchOnce, safeSet])

  const setPaymentStatus = useCallback(
    async (status: string) => {
      if (!hasLookup || !s.payment) return
      const oldPayment = s.payment
      safeSet(prev => ({
        ...prev,
        payment: { ...oldPayment, payment_status: status },
      }))
      try {
        await adminUpdatePaymentStatus(orderLookup, status)
      } catch (e) {
        toast.error('Błąd zmiany statusu płatności')
        safeSet(prev => ({ ...prev, payment: oldPayment }))
      }
    },
    [hasLookup, orderLookup, s.payment, safeSet]
  )

  const setServiceFee = useCallback(
    async (fee_pct: number) => {
      if (!hasLookup || !s.payment) return
      const oldPayment = s.payment
      
      // ⭐️ Optymistyczna aktualizacja z obliczeniami
      const subtotal = oldPayment.total_subtotal
      const paymentPct = oldPayment.payment_fee_pct || 0
      const newServiceFeeAmount = round2(subtotal * (fee_pct / 100.0))
      const newPaymentFeeAmount = round2((subtotal + newServiceFeeAmount) * (paymentPct / 100.0))
      const newTotalExpected = subtotal + newServiceFeeAmount + newPaymentFeeAmount

      safeSet(prev => ({
        ...prev,
        payment: { 
          ...oldPayment,
          payment_service_fee: fee_pct,
          total_service_fee: newServiceFeeAmount,
          total_expected_amount: newTotalExpected,
        },
      }))
      
      try {
        await adminUpdateServiceFee(orderLookup, fee_pct)
        // ⭐️ Usunięto `refresh()` - nie jest już potrzebny
      } catch (e) {
        toast.error('Błąd zmiany prowizji')
        safeSet(prev => ({ ...prev, payment: oldPayment }))
      }
    },
    [hasLookup, orderLookup, s.payment, safeSet] // ⭐️ Usunięto `refresh`
  )

  const setPaymentNote = useCallback(
    async (note: string) => {
      if (!hasLookup || !s.payment) return
      const oldPayment = s.payment
      safeSet(prev => ({
        ...prev,
        payment: { ...oldPayment, payment_note: note },
      }))
      try {
        await adminUpdatePaymentNote(orderLookup, note)
      } catch (e) {
        toast.error('Błąd zapisu notatki')
        safeSet(prev => ({ ...prev, payment: oldPayment }))
      }
    },
    [hasLookup, orderLookup, s.payment, safeSet]
  )

  const setAdminData = useCallback(
    async (costs: number, received: number) => {
      if (!hasLookup || !s.payment) return
      
      const oldPayment = s.payment
      const newProfit = received - costs // Obliczamy profit w UI

      safeSet(prev => ({
        ...prev,
        payment: { 
          ...oldPayment, 
          admin_amount_costs: costs, 
          admin_amount_received: received,
          admin_amount_profit: newProfit, // Ustawiamy nowy profit
        },
      }))
      try {
        await adminUpdateAdminData(orderLookup, costs, received)
        // ⭐️ Usunięto `refresh()`
      } catch (e) {
        toast.error('Błąd zapisu danych admina')
        safeSet(prev => ({ ...prev, payment: oldPayment }))
      }
    },
    [hasLookup, orderLookup, s.payment, safeSet] // ⭐️ Usunięto `refresh`
  )

  const setProductSplit = useCallback(
    async (received: number, due: number) => {
      if (!hasLookup || !s.payment) return
      const oldPayment = s.payment
      
      safeSet(prev => ({
        ...prev,
        payment: { ...oldPayment, split_received: received, split_due: due },
      }))
      try {
        await adminUpdateProductSplit(orderLookup, received, due)
      } catch (e) {
        toast.error('Błąd zapisu podziału kwoty')
        safeSet(prev => ({ ...prev, payment: oldPayment }))
      }
    },
    [hasLookup, orderLookup, s.payment, safeSet]
  )

  const addTransaction = useCallback(
    async (amount: number, note: string | null) => {
      const paymentId = s.payment?.id
      const orderId = s.payment?.order_id
      if (!hasLookup || !paymentId || !orderId) {
        toast.error('Brak ID płatności lub zamówienia.')
        return
      }

      const oldTransactions = s.transactions
      try {
        const newTransaction = await adminAddTransaction(paymentId, orderId, amount, note)
        if (!newTransaction) throw new Error('RPC nie zwróciło nowej transakcji')

        // ⭐️ Zostawiamy `refresh`, bo `adminAddTransaction` aktualizuje `admin_amount_received`
        toast.success('Dodano wpłatę')
        await refresh() 
      } catch (e) {
        toast.error('Błąd dodawania transakcji')
        safeSet(prev => ({ ...prev, transactions: oldTransactions }))
      }
    },
    [hasLookup, s.payment?.id, s.payment?.order_id, s.transactions, safeSet, refresh]
  )

  const deleteTransaction = useCallback(
    async (transaction_uuid: string) => {
      if (!hasLookup) return
      const oldTransactions = s.transactions
      safeSet(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== transaction_uuid),
      }))
      try {
        await adminDeleteTransaction(transaction_uuid)
        // ⭐️ Zostawiamy `refresh`, bo `adminDeleteTransaction` aktualizuje `admin_amount_received`
        toast.success('Usunięto wpłatę')
        await refresh() 
      } catch (e) {
        toast.error('Błąd usuwania transakcji')
        safeSet(prev => ({ ...prev, transactions: oldTransactions }))
      }
    },
    [hasLookup, s.transactions, safeSet, refresh]
  )

  const targetAmountPLN = useMemo(() => {
    if (!s.payment) return 0
    // Użyj kwoty z bazy, jeśli jest
    if (s.payment.total_expected_amount > 0) {
      return s.payment.total_expected_amount
    }
    
    // Obliczenie rezerwowe
    const p = s.payment
    const subtotal = parseNum(p.total_subtotal) 
    const servicePct = parseNum(p.payment_service_fee) 
    const serviceAmount = round2(subtotal * (servicePct / 100))
    
    const payPct = parseNum(p.payment_fee_pct)
    const payBase = subtotal + serviceAmount
    const paymentFee = round2(payBase * (payPct / 100))
    
    return subtotal + serviceAmount + paymentFee
  }, [s.payment])

  return {
    loading: s.loading,
    refreshing: s.refreshing,
    payment: s.payment,
    transactions: s.transactions,
    targetAmountPLN: s.payment?.total_expected_amount ?? targetAmountPLN,
    fxRates: s.fxRates,
    error: s.error,

    refresh,
    
    setPaymentStatus,
    setServiceFee,
    setPaymentNote,
    setAdminData,
    setProductSplit,
    addTransaction,
    deleteTransaction,
  }
}

export type UsePaymentsReturn = ReturnType<typeof usePayments>