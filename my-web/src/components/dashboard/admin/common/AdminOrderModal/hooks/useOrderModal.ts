'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
    AdminOrderModalData,
    Attachment,
    OrderItem,
    StatusBlock,
    OrderPayment,
    OrderPaymentTransaction,
} from '../AdminOrderTypes'
import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import {
    addAttachments as addAttachmentService,
    deleteAttachment as deleteAttachmentService,
} from '../panels/StatusPanel/attachments.service'
import {
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
    status: StatusBlock | null
    attachments: Attachment[]
    items: OrderItem[]
    orderNote: string
    adminNote: string
    payment: OrderPayment | null
    transactions: OrderPaymentTransaction[]
    fxRates: Record<string, number>
    error: string | null
}

// Helpery do obliczeń
const parseNum = (v: unknown) => {
    if (v === null || v === undefined) return 0
    const n = Number(String(v).replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
}
const round2 = (n: number) => Math.round(n * 100) / 100

export function useOrderModal(orderLookup: string) {
    const [s, setS] = useState<State>({
        loading: true,
        refreshing: false,
        status: null,
        attachments: [],
        items: [],
        orderNote: '',
        adminNote: '',
        payment: null,
        transactions: [],
        fxRates: { PLN: 1 },
        error: null,
    })

    const mounted = useRef(false)
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const safeSet = useCallback((patch: Partial<State> | ((prev: State) => Partial<State>)) => {
        if (!mounted.current) return
        setS(prev => {
            const p = typeof patch === 'function' ? patch(prev) : patch
            return { ...prev, ...p }
        })
    }, [])

    const trimLookup = (v: string) => (v ?? '').trim()

    const recalcItemsTotalByLookup = useCallback(async (lookupRaw: string) => {
        const lookup = trimLookup(lookupRaw)
        if (!lookup) return
        try {
            const { data: resolvedId, error: resErr } = await supabase.rpc('admin_order_resolve_id', { p_input: lookup })
            if (resErr) throw resErr
            const orderId = (resolvedId ?? null) as string | null
            if (!orderId) return
            const { error: fnErr } = await supabase.rpc('admin_update_modal_order_items_total_value', { p_order_id: orderId })
            if (fnErr) throw fnErr
        } catch (err) {
            logSbError('[useOrderModal] recalcItemsTotalByLookup', err)
        }
    }, [])

    const fetchOnce = useCallback(async () => {
        const lookup = trimLookup(orderLookup)
        if (!lookup) {
            safeSet({
                loading: false,
                refreshing: false,
                status: null,
                attachments: [],
                items: [],
                orderNote: '',
                adminNote: '',
                payment: null,
                transactions: [],
                fxRates: { PLN: 1 },
                error: null,
            })
            return
        }

        safeSet({ loading: true, error: null })
        try {
            const [payload, rates] = await Promise.all([
                supabase.rpc('admin_get_modal_order', { p_lookup: lookup, p_limit_attachments: 10 }).then(res => {
                    if (res.error) throw res.error
                    return (res.data ?? null) as AdminOrderModalData | null
                }),
                adminFetchCurrencyRates().catch(() => ({ PLN: 1 } as Record<string, number>)),
            ])
            
            if (!payload) {
                safeSet({ loading: false, status: null })
                return
            }
            
            safeSet({
                loading: false,
                refreshing: false,
                status: payload?.status ?? null,
                attachments: payload?.attachments ?? [],
                items: payload?.items ?? [],
                orderNote: payload?.order_note ?? '',
                adminNote: payload?.admin_note ?? '',
                payment: (payload?.payment as OrderPayment) ?? null,
                transactions: payload?.transactions ?? [],
                fxRates: rates,
                error: null,
            })
        } catch (err: any) {
            logSbError('[useOrderModal] admin_get_modal_order', err)
            safeSet({ loading: false, status: null, error: err?.message ?? 'Fetch error' })
        }
    }, [orderLookup, safeSet])

    useEffect(() => {
        void fetchOnce()
    }, [fetchOnce])

    const refresh = useCallback(async () => {
        safeSet({ refreshing: true })
        try {
            await fetchOnce()
        } finally {
            safeSet({ refreshing: false })
        }
    }, [fetchOnce, safeSet])

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(String(text ?? ''))
        } catch {
            /* ignore */
        }
    }, [])

    const changeStatus = useCallback(
        async (status: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return

            const oldStatus = s.status 
            
            safeSet(prev => ({ status: prev.status ? { ...prev.status, order_status: status } : prev.status }))

            try {
                const { data, error } = await supabase.rpc('admin_order_update_status', {
                    p_lookup: lookup,
                    p_status: status,
                    p_source: null,
                })
                if (error) throw error

                const newStatusBlock = (data as any)?.status
                if (newStatusBlock) {
                    safeSet({ status: newStatusBlock as StatusBlock })
                } else {
                    throw new Error('RPC did not return new status block')
                }
            } catch (err) {
                logSbError('[useOrderModal] changeStatus', err)
                safeSet({ status: oldStatus }) 
                throw err
            }
        },
        [orderLookup, safeSet, s.status]
    )

    const changeSource = useCallback(
        async (orderType: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return

            const oldStatus = s.status 

            safeSet(prev => ({ status: prev.status ? { ...prev.status, order_type: orderType } : prev.status }))

            try {
                const { data, error } = await supabase.rpc('admin_order_update_status', {
                    p_lookup: lookup,
                    p_status: null,
                    p_source: orderType,
                })
                if (error) throw error

                const newStatusBlock = (data as any)?.status
                if (newStatusBlock) {
                    safeSet({ status: newStatusBlock as StatusBlock })
                } else {
                    throw new Error('RPC did not return new status block')
                }
            } catch (err) {
                logSbError('[useOrderModal] changeSource', err)
                safeSet({ status: oldStatus }) 
                throw err 
            }
        },
        [orderLookup, safeSet, s.status]
    )

    const saveOrderNote = useCallback(
        async (note: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return ''
            try {
                const { data, error } = await supabase.rpc('admin_order_update_additional_info', {
                    p_lookup: lookup,
                    p_info: note ?? '',
                })
                if (error) throw error
                const next = ((data as any)?.order_note ?? note ?? '') as string
                safeSet({ orderNote: next })
                return next
            } catch (err) {
                logSbError('[useOrderModal] saveOrderNote', err)
                return ''
            }
        },
        [orderLookup, safeSet]
    )

    const saveAdminNote = useCallback(
        async (note: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return ''
            try {
                const { data, error } = await supabase.rpc('admin_order_update_admin_note', {
                    p_lookup: lookup,
                    p_info: note ?? '',
                })
                if (error) throw error
                const next = ((data as any)?.admin_note ?? note ?? '') as string
                safeSet({ adminNote: next })
                return next
            } catch (err) {
                logSbError('[useOrderModal] saveAdminNote', err)
                return ''
            }
        },
        [orderLookup, safeSet]
    )

    const addFiles = useCallback(
        async (files: File[]) => {
            const orderIdUUID = s.status?.order_id || s.status?.id
            const orderNumber = s.status?.order_number
            const { data: userData } = await supabase.auth.getUser()
            const userId = userData.user?.id
            if (!orderIdUUID || !userId || !orderNumber) {
                logSbError('[useOrderModal] addFiles', 'Missing order UUID, order Number or user ID.')
                throw new Error('Brak wymaganych ID.')
            }
            try {
                const newAttachments = await addAttachmentService(orderIdUUID, orderNumber, userId, files)
                safeSet(prev => ({
                    attachments: [...newAttachments, ...prev.attachments],
                }))
            } catch (error) {
                logSbError('[useOrderModal] addFiles failed', error)
                throw error
            }
        },
        [s.status, safeSet]
    )

    const deleteAttachment = useCallback(
        async (file: Attachment) => {
            const orderIdUUID = s.status?.order_id || s.status?.id
            if (!orderIdUUID) {
                logSbError('[useOrderModal] deleteAttachment', 'Missing order UUID.')
                return
            }
            try {
                await deleteAttachmentService(orderIdUUID, file)
                safeSet(prev => ({
                    attachments: prev.attachments.filter(a => a.id !== file.id),
                }))
            } catch (error) {
                logSbError('[useOrderModal] deleteAttachment failed', error)
                throw error
            }
        },
        [s.status, safeSet]
    )

    const uploadItemImages = useCallback(async (_itemId: string, _files: File[]) => {}, [])
    const updateTrackingCode = useCallback(async (_code: string) => {}, [])
    const commitActualShipping = useCallback(async (_amountPLN: number) => {}, [])

    const changeItems = useCallback(
        async (_rows: OrderItem[]) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return
            try {
                await recalcItemsTotalByLookup(lookup)
                await refresh()
            } catch (err) {
                logSbError('[useOrderModal] changeItems → recalc', err)
            }
        },
        [orderLookup, recalcItemsTotalByLookup, refresh]
    )

    const setPaymentStatus = useCallback(
        async (status: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup || !s.payment) return
            const oldPayment = s.payment
            safeSet(prev => ({ ...prev, payment: { ...oldPayment, payment_status: status } }))
            try {
                await adminUpdatePaymentStatus(lookup, status)
            } catch (e) {
                toast.error('Błąd zmiany statusu płatności')
                safeSet(prev => ({ ...prev, payment: oldPayment }))
            }
        },
        [orderLookup, s.payment, safeSet]
    )

    const setServiceFee = useCallback(
        async (fee_pct: number) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup || !s.payment) return
            
            const oldPayment = s.payment
            
            const subtotal = oldPayment.total_subtotal
            const paymentPct = oldPayment.payment_fee_pct || 0
            
            const newServiceFeeAmount = round2(subtotal * (fee_pct / 100.0))
            const newPaymentFeeAmount = round2((subtotal + newServiceFeeAmount) * (paymentPct / 100.0))
            const newTotalExpected = subtotal + newServiceFeeAmount + newPaymentFeeAmount

            safeSet(prev => ({
                ...prev,
                payment: { 
                    ...oldPayment,
                    payment_service_fee: fee_pct, // ⭐️ TO POLE ZOSTAŁO PRZYWRÓCONE
                    total_service_fee: newServiceFeeAmount,
                    payment_fee: newPaymentFeeAmount,
                    total_expected_amount: newTotalExpected,
                },
            }))
            
            try {
                await adminUpdateServiceFee(lookup, fee_pct)
            } catch (e) {
                toast.error('Błąd zmiany prowizji')
                safeSet(prev => ({ ...prev, payment: oldPayment }))
            }
        },
        [orderLookup, s.payment, safeSet]
    )

    const setPaymentNote = useCallback(
        async (note: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup || !s.payment) return
            const oldPayment = s.payment
            safeSet(prev => ({ ...prev, payment: { ...oldPayment, payment_note: note } }))
            try {
                await adminUpdatePaymentNote(lookup, note)
            } catch (e) {
                toast.error('Błąd zapisu notatki')
                safeSet(prev => ({ ...prev, payment: oldPayment }))
            }
        },
        [orderLookup, s.payment, safeSet]
    )

    const setAdminData = useCallback(
        async (costs: number, received: number) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup || !s.payment) return
            
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
                await adminUpdateAdminData(lookup, costs, received)
            } catch (e) {
                toast.error('Błąd zapisu danych admina')
                safeSet(prev => ({ ...prev, payment: oldPayment }))
            }
        },
        [orderLookup, s.payment, safeSet]
    )

    const setProductSplit = useCallback(
        async (received: number, due: number) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup || !s.payment) return
            const oldPayment = s.payment
            
            safeSet(prev => ({
                ...prev,
                payment: { ...oldPayment, split_received: received, split_due: due },
            }))
            try {
                await adminUpdateProductSplit(lookup, received, due)
            } catch (e) {
                toast.error('Błąd zapisu podziału kwoty')
                safeSet(prev => ({ ...prev, payment: oldPayment }))
            }
        },
        [orderLookup, s.payment, safeSet]
    )

    const addTransaction = useCallback(
        async (amount: number, note: string | null) => {
            const lookup = trimLookup(orderLookup)
            const paymentId = s.payment?.id
            const orderId = s.payment?.order_id
            if (!lookup || !paymentId || !orderId) {
                toast.error('Brak ID płatności lub zamówienia.')
                return
            }
            
            const oldTransactions = s.transactions

            try {
                const newTransaction = await adminAddTransaction(paymentId, orderId, amount, note)
                if (!newTransaction) throw new Error('RPC nie zwróciło nowej transakcji')

                safeSet(prev => ({
                    ...prev,
                    transactions: [newTransaction as OrderPaymentTransaction, ...prev.transactions],
                }))
                toast.success('Dodano wpłatę')
            } catch (e) {
                toast.error('Błąd dodawania transakcji')
                safeSet(prev => ({ ...prev, transactions: oldTransactions }))
            }
        },
        [orderLookup, s.payment?.id, s.payment?.order_id, s.transactions, safeSet]
    )

    const deleteTransaction = useCallback(
        async (transaction_uuid: string) => {
            const lookup = trimLookup(orderLookup)
            if (!lookup) return
            
            const oldTransactions = s.transactions
            
            safeSet(prev => ({
                ...prev,
                transactions: prev.transactions.filter(t => t.id !== transaction_uuid),
            }))
            
            try {
                await adminDeleteTransaction(transaction_uuid)
                toast.success('Usunięto wpłatę')
            } catch (e) {
                toast.error('Błąd usuwania transakcji')
                safeSet(prev => ({ ...prev, transactions: oldTransactions }))
            }
        },
        [orderLookup, s.transactions, safeSet]
    )

    const targetAmountPLN = useMemo(() => {
        if (!s.payment) return 0
        if (s.payment.total_expected_amount > 0) {
            return s.payment.total_expected_amount
        }
        const p = s.payment
        const subtotal = parseNum(p.total_subtotal)
        // ⭐️ Zmieniono z total_service_fee z powrotem na payment_service_fee (procent)
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
        status: s.status,
        attachments: s.attachments,
        items: s.items,
        orderNote: s.orderNote,
        adminNote: s.adminNote,
        
        refresh,
        copy,
        changeStatus,
        changeSource,
        saveOrderNote,
        saveAdminNote,
        changeItems,
        addFiles,
        deleteAttachment,
        uploadItemImages,
        updateTrackingCode,
        commitActualShipping,
        
        payment: s.payment,
        transactions: s.transactions,
        fxRates: s.fxRates,
        targetAmountPLN,
        error: s.error,
        
        setPaymentStatus,
        setServiceFee,
        setPaymentNote,
        setAdminData,
        setProductSplit,
        addTransaction,
        deleteTransaction,
    }
}

export type UseOrderModalReturn = ReturnType<typeof useOrderModal>