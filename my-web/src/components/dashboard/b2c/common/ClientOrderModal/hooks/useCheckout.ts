'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import type {
    CheckoutPanelDB,
    Currency,
    MethodCode, // Zakładamy, że MethodCode został rozszerzony w clientOrderTypes.ts
    PaymentMethod,
    ShippingQuote,
    CheckoutBreakdown,
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

export type UseCheckoutInput = {
    orderNumber: string
    cp: CheckoutPanelDB
    fxRates?: Partial<Record<Currency, number>>
    paymentFees?: Partial<Record<MethodCode | string, number>>
}

export type UseCheckoutState = {
    // ... (niezmienione exporty UseCheckoutState)
    loading: boolean
    error: string | null
    clearError: () => void

    rates: Partial<Record<Currency, number>>
    currencies: Currency[]
    currency: Currency
    setCurrency: (c: Currency | string) => void
    toPLN: (amount: number, currency?: Currency | string) => number
    fromPLN: (amountPLN: number, currency?: Currency | string) => number
    format: (amount: number, currency?: Currency | string) => string

    methods: PaymentMethod[]
    method: PaymentMethod | null
    setMethod: (code: MethodCode | string) => void

    selectedQuoteId: string | null
    setSelectedQuoteId: (id: string | number | null) => void

    saveQuote: (quoteId: string | number) => Promise<void>
    saveCurrency: (c: Currency | string) => Promise<void>
    saveMethod: (code: MethodCode | string) => Promise<void>

    breakdown: CheckoutBreakdown
    refresh: () => Promise<void>
}

/* ===== helpers ===== */
const round2 = (n: number) => Math.round(n * 100) / 100
const safeNum = (v: unknown, def = 0) => {
    const n = Number(
        String(v ?? '')
            .replace(/\s/g, '')
            .replace(',', '.')
    )
    return Number.isFinite(n) ? n : def
}

// ⭐️ POPRAWKA: Używamy listy TYLKO używanych kodów
const ACCEPTED_METHOD_CODES = [
    'paypal',
    'revolut',
    'stripe', // DODANO 'stripe'
] as const;

// ⭐️ POPRAWKA: Aktualizacja asMethodCode
const asMethodCode = (v: string | null | undefined): MethodCode => {
    const x = String(v || '').toLowerCase();
    
    // Używamy ReadonlyArray, aby sprawdzić, czy kod istnieje w liście
    if ((ACCEPTED_METHOD_CODES as ReadonlyArray<string>).includes(x)) {
        return x as MethodCode;
    }
    // Domyślnie 'paypal'
    return 'paypal' as MethodCode;
}

const asCurrency = (v: string | null | undefined): Currency => {
    const x = String(v || '').toUpperCase()
    return x === 'PLN' || x === 'EUR' || x === 'USD' || x === 'GBP' ? (x as Currency) : 'PLN'
}
const isAccepted = (q: ShippingQuote) =>
    String(q?.quote_status ?? '')
        .toLowerCase()
        .includes('accepted')

export function useCheckout(input: UseCheckoutInput): UseCheckoutState {
    const { orderNumber, cp, fxRates, paymentFees } = input

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const clearError = useCallback(() => setError(null), [])
    const mountedRef = useRef(true)
    useEffect(
        () => () => {
            mountedRef.current = false
        },
        []
    )

    // waluty
    const [rates, setRates] = useState<Partial<Record<Currency, number>>>({ PLN: 1 })
    const [currencies, setCurrencies] = useState<Currency[]>(['PLN'])
    const [currency, setCurrencyState] = useState<Currency>(asCurrency(cp.payment_currency))

    // metody
    const [methods, setMethods] = useState<PaymentMethod[]>([])
    const [method, setMethodState] = useState<PaymentMethod | null>(null)

    // wybór oferty
    const computedInitialQuoteId = useMemo(() => {
        const acc = (cp.quotes || []).find(isAccepted)
        if (acc) return String(acc.id)
        const sel = (cp.quotes || []).find(q => !!q.selected)
        if (sel) return String(sel.id)
        return (cp.quotes?.length ? String(cp.quotes[0].id) : null) as string | null
    }, [cp.quotes])

    const [selectedQuoteId, setSelectedQuoteIdRaw] = useState<string | null>(computedInitialQuoteId)
    useEffect(() => {
        const still = selectedQuoteId && (cp.quotes || []).some(q => String(q.id) === String(selectedQuoteId))
        if (still) return
        setSelectedQuoteIdRaw(computedInitialQuoteId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cp.quotes, computedInitialQuoteId])

    const setSelectedQuoteId = (id: string | number | null) => setSelectedQuoteIdRaw(id == null ? null : String(id))

    /* ===== fetch rates + methods ===== */
    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [{ data: rateRows, error: rateErr }, { data: methodRows, error: methErr }] = await Promise.all([
                supabase.from('admin_currency_rates').select('currency_code, currency_rate_in_pln'),
                supabase
                    .from('order_payment_methods')
                    .select('payment_code, payment_method_name, payment_fee, payment_api, payment_is_active, payment_is_default'),
            ])
            if (rateErr) throw rateErr
            if (methErr) throw methErr

            // rates
            const base: Partial<Record<Currency, number>> = {}
            for (const r of (rateRows ?? []) as RateRow[]) {
                const code = asCurrency(r.currency_code)
                const rate = safeNum(r.currency_rate_in_pln, 0)
                if (rate) base[code] = rate
            }
            if (!base.PLN) base.PLN = 1
            const merged = { ...base }
            if (fxRates) {
                for (const [k, v] of Object.entries(fxRates)) {
                    const code = asCurrency(k)
                    const rate = safeNum(v, 0)
                    if (rate) merged[code] = rate
                }
            }
            const list = (['PLN', 'EUR', 'USD', 'GBP'] as Currency[]).filter(c => merged[c])
            setRates(merged)
            setCurrencies(list.length ? list : (['PLN'] as Currency[]))
            setCurrencyState(prev => (list.includes(prev) ? prev : asCurrency(cp.payment_currency) || 'PLN'))

            // methods (aktywne)
            let active: PaymentMethod[] = ((methodRows ?? []) as MethodRow[])
                .filter(m => !!m.payment_is_active)
                .map(m => {
                    // ⭐️ POPRAWKA: Rzutowanie na MethodCode jest teraz bezpieczne
                    const codeL = asMethodCode(m.payment_code)
                    return {
                        code: codeL,
                        name: m.payment_method_name || codeL.toUpperCase(),
                        feePct: safeNum(m.payment_fee, 0),
                        api: m.payment_api,
                        isActive: true,
                        isDefault: !!m.payment_is_default,
                    }
                })

            // override fee map
            if (paymentFees && Object.keys(paymentFees).length) {
                active = active.map(m => {
                    const key = m.code
                    const ov =
                        (paymentFees as any)[key] ??
                        (paymentFees as any)[key.toUpperCase()] ??
                        (paymentFees as any)[key.toLowerCase()]
                    return typeof ov === 'number' ? { ...m, feePct: Math.max(0, Number(ov)) } : m
                })
                if (!active.length) {
                    // fallback tylko z mapy
                    active = Object.entries(paymentFees).map(([code, pct]) => {
                        const c = asMethodCode(code)
                        return {
                            code: c,
                            name: c.toUpperCase(),
                            feePct: Math.max(0, Number(pct) || 0),
                            api: null,
                            isActive: true,
                            isDefault: false,
                        }
                    })
                }
            }

            active.sort((a, b) => (a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1))
            setMethods(active)

            // start method: z DB
            const byDb = active.find(m => m.code === asMethodCode(cp.payment_method_code)) || null
            const byDefault = active.find(m => m.isDefault) || null
            setMethodState(prev =>
                prev && active.some(m => m.code === prev.code) ? prev : byDb || byDefault || active[0] || null
            )

            setLoading(false)
        } catch (e: any) {
            setError(String(e?.message || e) || 'Fetch error')
            setLoading(false)
        }
    }, [cp.payment_currency, cp.payment_method_code, fxRates, paymentFees])

    useEffect(() => {
        void fetchAll()
    }, [fetchAll])

    const setCurrency = (c: Currency | string) => setCurrencyState(asCurrency(c))
    const setMethod = (code: MethodCode | string) => {
        const c = asMethodCode(code)
        const found = methods.find(m => m.code === c) || null
        setMethodState(found ?? { code: c, name: c.toUpperCase(), feePct: 0, api: null, isActive: true, isDefault: false })
    }

    /* ===== konwersje/format ===== */
    const toPLN = useCallback(
        (amount: number, c?: Currency | string) => {
            const cur = asCurrency(c ?? currency)
            const rate = rates[cur] ?? 1
            return round2(amount * (rate || 1))
        },
        [currency, rates]
    )

    const fromPLN = useCallback(
        (amountPLN: number, c?: Currency | string) => {
            const cur = asCurrency(c ?? currency)
            const rate = rates[cur] ?? 1
            if (!rate) return 0
            return round2(amountPLN / rate)
        },
        [currency, rates]
    )

    const format = useMemo(() => {
        return (amount: number, c?: Currency | string) => {
            const cur = asCurrency(c ?? currency)
            try {
                return new Intl.NumberFormat('pl-PL', {
                    style: 'currency',
                    currency: cur,
                    currencyDisplay: 'code',
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                }).format(round2(amount))
            } catch {
                return `${round2(amount)} ${cur}`
            }
        }
    }, [currency])

    /* ===== breakdown – wszystko z cp (DB) ===== */
    const breakdown: CheckoutBreakdown = useMemo(() => {
        const productsPLN = toPLN(safeNum(cp.order_total_items_value, 0), 'PLN')

        const sel =
            (cp.quotes || []).find(q => String(q.id) === String(selectedQuoteId)) ||
            (cp.quotes || []).find(isAccepted) ||
            null
        const shippingPLN = toPLN(safeNum(sel?.quote_carrier_fee, 0), 'PLN')

        const serviceFeePLN = toPLN(safeNum(cp.order_service_fee, 0), 'PLN')
        const base = productsPLN + shippingPLN
        const serviceFeePct = base > 0 ? round2((serviceFeePLN / base) * 100) : 0

        const paymentPct = safeNum(cp.payment_fee_pct, 0)
        const paymentFeePLN = round2((productsPLN + shippingPLN + serviceFeePLN) * (paymentPct / 100))

        const subtotalPLN = round2(productsPLN + shippingPLN + serviceFeePLN)
        const totalPLN = round2(subtotalPLN + paymentFeePLN)
        const total = fromPLN(totalPLN)

        return {
            productsPLN,
            shippingPLN,
            serviceFeePct,
            serviceFeePLN,
            paymentFeePct: paymentPct,
            paymentFeePLN,
            subtotalPLN,
            totalPLN,
            total,
        }
    }, [cp, selectedQuoteId, toPLN, fromPLN])

    const refresh = useCallback(async () => {
        await fetchAll()
    }, [fetchAll])

    /* ===== RPC zapisy (snake_case) ===== */
    const post = useCallback(
        async (patch: Record<string, unknown>) => {
            const res = await fetch('/api/rpc/user_order_update_checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lookup: orderNumber, patch }),
            })
            const raw = await res.text().catch(() => '')
            let json: any = null
            try {
                json = raw ? JSON.parse(raw) : null
            } catch {}
            if (!res.ok) {
                const msg = (json?.error || json?.message || raw || res.statusText || 'RPC error').toString()
                setError(msg)
                throw new Error(msg)
            }
            return json ?? {}
        },
        [orderNumber]
    )

    const opQuoteRef = useRef(0)
    const opCurrRef = useRef(0)
    const opMethRef = useRef(0)

    const saveQuote = useCallback(
        async (quoteId: string | number) => {
            const ticket = ++opQuoteRef.current
            const next = String(quoteId)
            const prev = selectedQuoteId
            setSelectedQuoteId(next)
            try {
                await post({ selected_quote_id: next })
                if (opQuoteRef.current !== ticket) return
            } catch {
                if (opQuoteRef.current !== ticket) return
                setSelectedQuoteId(prev ?? null)
            }
        },
        [post, selectedQuoteId]
    )

    const saveCurrency = useCallback(
        async (c: Currency | string) => {
            const ticket = ++opCurrRef.current
            const cur = asCurrency(c)
            const prev = currency
            setCurrency(cur)
            try {
                await post({ payment_currency: cur.toUpperCase() })
                if (opCurrRef.current !== ticket) return
            } catch {
                if (opCurrRef.current !== ticket) return
                setCurrency(prev)
            }
        },
        [post, currency]
    )

    const saveMethod = useCallback(
        async (code: MethodCode | string) => {
            const ticket = ++opMethRef.current
            const codeL = asMethodCode(code)
            const prev = method
            setMethod(codeL)
            try {
                await post({ payment_method_code: codeL.toUpperCase() })
                if (opMethRef.current !== ticket) return
            } catch {
                if (opMethRef.current !== ticket) return
                if (prev?.code) setMethod(prev.code)
                else if (methods[0]) setMethod(methods[0].code)
                else setMethod('paypal')
            }
        },
        [post, method, methods]
    )

    return {
        loading,
        error,
        clearError,
        rates,
        currencies,
        currency,
        setCurrency,
        toPLN,
        fromPLN,
        format,
        methods,
        method,
        setMethod,
        selectedQuoteId: selectedQuoteId ?? null,
        setSelectedQuoteId,
        saveQuote,
        saveCurrency,
        saveMethod,
        breakdown,
        refresh,
    }
}