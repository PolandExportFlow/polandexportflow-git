'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { OrderStatus } from '@/utils/orderStatus'
import type { CustomerOrder } from '../OrdersListWidget/OrdersListWidget'

const ORDERS_VIEW = 'v_users_orders_list'

export function useOrdersListPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const PAGE_SIZE = 8

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOrderId, setModalOrderId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const escapeLike = (s: string) =>
    s.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')

  const reqIdRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)

    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) {
        if (myId === reqIdRef.current) {
          setOrders([])
          setTotalPages(1)
          setLoading(false)
        }
        return
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const query = supabase
        .from(ORDERS_VIEW)
        .select(
          `
          id,
          order_number,
          created_at,
          order_status,
          order_country,
          items_json,
          items_text
          `,
          { count: 'exact' }
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (search) {
        const s = escapeLike(search.toLowerCase())
        query.or(
          [
            `order_number.ilike.%${s}%`,
            `order_status.ilike.%${s}%`,
            `order_country.ilike.%${s}%`,
            `items_text.ilike.%${s}%`,
          ].join(',')
        )
      }

      const { data, count, error: err } = await query
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

      if (myId === reqIdRef.current) {
        setOrders(mapped)
        setTotalPages(Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)))
      }
    } catch (e: any) {
      if (myId === reqIdRef.current) setError(e?.message ?? 'Failed to fetch orders')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [supabase, page, search])

  useEffect(() => { void fetchOrders() }, [fetchOrders])

  const openOrder = (id: string) => setModalOrderId(id)
  const closeOrder = () => setModalOrderId(null)
  const refresh = useCallback(async () => { await fetchOrders() }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    modalOrderId,
    openOrder,
    closeOrder,
    refresh,

    page,
    setPage,
    totalPages,

    search: searchInput,
    setSearch: setSearchInput,
  }
}