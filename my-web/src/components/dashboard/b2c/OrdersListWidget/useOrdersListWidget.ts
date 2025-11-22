'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrderStatus } from '@/utils/orderStatus'
import type { CustomerOrder } from './OrdersListWidget'

export function useOrdersListWidget(limit = 5) {
    const supabase = useMemo(
        () => createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ),
        []
    )

    const [orders, setOrders] = useState<CustomerOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modalOrderId, setModalOrderId] = useState<string | null>(null)

    const openOrder = (id: string) => setModalOrderId(id)
    const closeOrder = () => setModalOrderId(null)

    const reqIdRef = useRef(0)

    const fetchOrders = useCallback(async (opts?: { silent?: boolean }) => {
        const myId = ++reqIdRef.current
        if (!opts?.silent) setLoading(true)
        setError(null)
        try {
            const { data: auth } = await supabase.auth.getUser()
            const user = auth?.user
            if (!user) {
                setOrders([])
                setLoading(false)
                return
            }

            // ZMIANA: POBIERANIE Z NOWEGO WIDOKU 'v_users_orders_list'
            const { data, error: err } = await supabase
                .from('v_users_orders_list')
                .select(`
                    id,
                    order_number,
                    created_at,
                    order_status,
                    order_country,
                    items_json
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (err) throw err

            const mapped: CustomerOrder[] = (data ?? []).map((r: any) => ({
                id: r.order_number ?? r.id, 
                createdAt: r.created_at,
                status: r.order_status as OrderStatus,
                destination: r.order_country ?? '—',
                items: Array.isArray(r.items_json)
                    ? r.items_json.map((j: any) => ({
                        name: String(j?.name ?? ''),
                        qty: Number(j?.qty ?? 1),
                    }))
                    : [],
            }))

            if (myId === reqIdRef.current) setOrders(mapped)
        } catch (e: any) {
            if (myId === reqIdRef.current) setError(e?.message ?? 'Failed to fetch orders')
        } finally {
            if (myId === reqIdRef.current && !opts?.silent) setLoading(false)
        }
    }, [supabase, limit])

    useEffect(() => { void fetchOrders() }, [fetchOrders])

    const lastRefreshRef = useRef(0)
    const throttledRefresh = useCallback(() => {
        const now = Date.now()
        if (now - lastRefreshRef.current > 2000) {
            lastRefreshRef.current = now
            void fetchOrders({ silent: true })
        }
    }, [fetchOrders])

    useEffect(() => {
        const chOrders = supabase
            .channel('orders-user-live')
            .on('postgres_changes', { schema: 'public', table: 'orders', event: '*' }, throttledRefresh)
            .subscribe()
        const chItems = supabase
            .channel('order-items-user-live')
            .on('postgres_changes', { schema: 'public', table: 'order_items', event: '*' }, throttledRefresh)
            .subscribe()
        return () => {
            supabase.removeChannel(chOrders)
            supabase.removeChannel(chItems)
        }
    }, [supabase, throttledRefresh])

    const refresh = useCallback(async () => { await fetchOrders() }, [fetchOrders])

    return { orders, loading, error, modalOrderId, openOrder, closeOrder, refresh }
}