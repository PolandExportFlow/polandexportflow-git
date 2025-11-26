'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type {
    PaymentPanelDB, // ✅ ZMIANA: Nowy typ z clientOrderTypes
    Currency,
    MethodCode,
    PaymentMethod,
    ShippingQuote,
    PaymentBreakdown, // ✅ ZMIANA: Nowy typ z clientOrderTypes
} from '../clientOrderTypes'

type RateRow = { currency_code: string; currency_rate_in_pln: number }
type MethodRow = {
    payment_code: string
    payment_method_name: string | null
    payment_fee: number | null
    payment_api: string | null
    payment_is_active: boolean | null
    payment_is_default: boolean | null
}

export type UsePaymentInput = {
    orderNumber: string
    data: PaymentPanelDB // ✅ ZMIANA: Używamy poprawnego typu
    fxRates?: Partial<Record<Currency, number>>
    paymentFees?: Partial<Record<MethodCode | string, number>>
}

const round2 = (n: number) => Math.round(n * 100) / 100
const safeNum = (v: unknown, def = 0) => {
    const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : def
}
const asCurrency = (v: string | null | undefined): Currency => {
    const x = String(v || '').toUpperCase()
    return ['PLN', 'EUR', 'USD', 'GBP'].includes(x) ? (x as Currency) : 'PLN'
}
const isAccepted = (q: ShippingQuote) => String(q?.quote_status ?? '').toLowerCase().includes('accepted')


export function usePayment(input: UsePaymentInput) {
    const { orderNumber, data: cp, fxRates, paymentFees } = input

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    const [rates, setRates] = useState<Partial<Record<Currency, number>>>({ PLN: 1 })
    const [currencies, setCurrencies] = useState<Currency[]>(['PLN'])
    const [currency, setCurrencyState] = useState<Currency>(asCurrency(cp.payment_currency))

    const [methods, setMethods] = useState<PaymentMethod[]>([])
    const [method, setMethodState] = useState<PaymentMethod | null>(null)

    // Initial Quote Selection
    const computedInitialQuoteId = useMemo(() => {
        const acc = (cp.quotes || []).find(isAccepted)
        if (acc) return String(acc.id)
        const sel = (cp.quotes || []).find(q => !!q.selected)
        if (sel) return String(sel.id)
        return (cp.quotes?.length ? String(cp.quotes[0].id) : null)
    }, [cp.quotes])

    const [selectedQuoteId, setSelectedQuoteIdRaw] = useState<string | null>(computedInitialQuoteId)
    const setSelectedQuoteId = (id: string | number | null) => setSelectedQuoteIdRaw(id == null ? null : String(id))

    // Fetch Logic
    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [{ data: rateRows }, { data: methodRows }] = await Promise.all([
                supabase.from('admin_currency_rates').select('currency_code, currency_rate_in_pln'),
                supabase.from('order_payment_methods').select('*'),
            ])

            // 1. Rates
            const base: Partial<Record<Currency, number>> = { PLN: 1 }
            for (const r of (rateRows ?? []) as RateRow[]) {
                const code = asCurrency(r.currency_code)
                const rate = safeNum(r.currency_rate_in_pln, 0)
                if (rate) base[code] = rate
            }
            if (fxRates) Object.assign(base, fxRates)
            
            const list = (['PLN', 'EUR', 'USD', 'GBP'] as Currency[]).filter(c => base[c])
            setRates(base)
            setCurrencies(list.length ? list : (['PLN'] as Currency[]))
            setCurrencyState(prev => (list.includes(prev) ? prev : asCurrency(cp.payment_currency)))

            // 2. Methods
            let active: PaymentMethod[] = ((methodRows ?? []) as MethodRow[])
                .filter(m => !!m.payment_is_active)
                .map(m => {
                    const codeRaw = String(m.payment_code || '').toLowerCase()
                    return {
                        code: codeRaw as MethodCode,
                        name: m.payment_method_name || codeRaw.toUpperCase(),
                        feePct: safeNum(m.payment_fee, 0),
                        api: m.payment_api,
                        isActive: true,
                        isDefault: !!m.payment_is_default,
                    }
                })

            if (paymentFees) {
                active = active.map(m => {
                    const ov = (paymentFees as any)[m.code]
                    return typeof ov === 'number' ? { ...m, feePct: Math.max(0, ov) } : m
                })
            }

            active.sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1))
            setMethods(active)

            const currentCode = String(cp.payment_method_code || '').toLowerCase()
            const byDb = active.find(m => m.code === currentCode)
            const byDefault = active.find(m => m.isDefault)
            
            setMethodState(prev => 
                (prev && active.some(m => m.code === prev.code)) ? prev : (byDb || byDefault || active[0] || null)
            )

            setLoading(false)
        } catch (e: any) {
            setError(e.message || 'Fetch error')
            setLoading(false)
        }
    }, [cp.payment_currency, cp.payment_method_code, fxRates, paymentFees])

    useEffect(() => { void fetchAll() }, [fetchAll])

    const toPLN = useCallback((amount: number, c?: string) => {
        const cur = asCurrency(c ?? currency)
        return round2(amount * (rates[cur] ?? 1))
    }, [currency, rates])

    const fromPLN = useCallback((amountPLN: number, c?: string) => {
        const cur = asCurrency(c ?? currency)
        const r = rates[cur] ?? 1
        return r ? round2(amountPLN / r) : 0
    }, [currency, rates])

    const format = useMemo(() => (amount: number, c?: string) => {
        const cur = asCurrency(c ?? currency)
        try {
            return new Intl.NumberFormat('pl-PL', {
                style: 'currency', currency: cur, currencyDisplay: 'code'
            }).format(round2(amount))
        } catch { return `${round2(amount)} ${cur}` }
    }, [currency])

    // Payment Breakdown
    const breakdown: PaymentBreakdown = useMemo(() => { // ✅ ZMIANA TYPU
        const productsPLN = toPLN(safeNum(cp.order_total_items_value, 0), 'PLN')
        const selQuote = (cp.quotes || []).find(q => String(q.id) === String(selectedQuoteId)) || 
                         (cp.quotes || []).find(isAccepted)
        const shippingPLN = toPLN(safeNum(selQuote?.quote_carrier_fee, 0), 'PLN')
        const serviceFeePLN = toPLN(safeNum(cp.order_service_fee, 0), 'PLN')
        
        const base = productsPLN + shippingPLN
        const serviceFeePct = base > 0 ? round2((serviceFeePLN / base) * 100) : 0
        
        const paymentPct = safeNum(cp.payment_fee_pct, 0)
        const paymentFeePLN = round2((productsPLN + shippingPLN + serviceFeePLN) * (paymentPct / 100))

        const subtotalPLN = round2(productsPLN + shippingPLN + serviceFeePLN)
        const totalPLN = round2(subtotalPLN + paymentFeePLN)

        return {
            productsPLN, shippingPLN, serviceFeePct, serviceFeePLN,
            paymentFeePct: paymentPct, paymentFeePLN,
            subtotalPLN, totalPLN, total: fromPLN(totalPLN)
        }
    }, [cp, selectedQuoteId, toPLN, fromPLN])

    // RPC Updates
    const post = useCallback(async (patch: Record<string, unknown>) => {
        const res = await fetch('/api/rpc/user_order_update_checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lookup: orderNumber, patch }),
        })
        if (!res.ok) throw new Error('Update payment failed')
    }, [orderNumber])

    const saveQuote = async (id: string | number) => {
        setSelectedQuoteId(id)
        await post({ selected_quote_id: String(id) }).catch(() => setSelectedQuoteId(selectedQuoteId))
    }
    const saveCurrency = async (c: string) => {
        const prev = currency
        setCurrencyState(asCurrency(c))
        await post({ payment_currency: asCurrency(c).toUpperCase() }).catch(() => setCurrencyState(prev))
    }
    const saveMethod = async (code: string) => {
        const prev = method
        const next = methods.find(m => m.code === code)
        if(next) setMethodState(next)
        await post({ payment_method_code: code.toLowerCase() }).catch(() => setMethodState(prev))
    }

    return {
        loading, error, rates, currencies, currency, 
        methods, method, breakdown, selectedQuoteId,
        setCurrency: saveCurrency,
        setMethod: saveMethod,
        saveQuote,
        fromPLN, format
    }
}