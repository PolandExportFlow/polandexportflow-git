// app/.../sections/clients/useClientsList.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type ClientType = 'B2C' | 'B2B'

// ZMIANA: Typy w snake_case
export type ClientRow = {
  id: string
  name: string
  email: string
  phone?: string | null
  country: string | null // ZMIANA
  type: ClientType
  orders_count: number // ZMIANA
  total_spent_pln: number // ZMIANA
  last_order_at: string | null // ZMIANA
  created_at: string // ZMIANA
}

// ZMIANA: Klucze sortowania w snake_case
export type SortKey =
  | 'id' | 'name' | 'email' | 'country' | 'type'
  | 'orders_count' | 'total_spent_pln' | 'last_order_at' | 'created_at'

export type Filters = {
  q: string
  country: string // Przechowuje NAZWĘ kraju
  type: 'all' | ClientType
  returning?: boolean
}

export type ClientsListCtrl = {
  data: ClientRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortKey: SortKey | null
  sortDir: 'asc' | 'desc'
  filters: Filters
  refreshing: boolean
  showPageSize: boolean
  setShowPageSize: (fnOrVal: boolean | ((v: boolean) => boolean)) => void
  setPage: (n: number) => void
  setPageSize: (n: number) => void
  setSortExact: (key: SortKey, dir: 'asc'|'desc') => void
  resetSort: () => void
  setFilters: (f: Partial<Filters>) => void
  resetFilters: () => void
  refresh: () => void
}

const DEFAULT_PAGE_SIZE = 25
const VIEW = 'v_admin_clients_list'

// Typ DbViewRow pasujący do nowego SQL
type DbViewRow = ClientRow & { search: string }


export function useClientsList(): ClientsListCtrl {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [data, setData] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [sortKey, setSortKey] = useState<SortKey | null>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [refreshing, setRefreshing] = useState(false)
  const [showPageSize, setShowPageSizeState] = useState(false)

  const [filters, setFiltersState] = useState<Filters>({
    q: '',
    country: '', 
    type: 'all',
    returning: false,
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const setShowPageSize = (fnOrVal: boolean | ((v: boolean) => boolean)) =>
    setShowPageSizeState(prev =>
      typeof fnOrVal === 'function' ? (fnOrVal as any)(prev) : !!fnOrVal
    )

  const resetFiltersState = () =>
    setFiltersState({ q: '', country: '', type: 'all', returning: false })

  const setSortExact = (key: SortKey, dir: 'asc' | 'desc') => {
    setSortKey(key)
    setSortDir(dir)
  }
  const resetSort = () => {
    setSortKey('created_at')
    setSortDir('desc')
  }

  // ===== fetch z trybem silent =====
  const fetchList = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent
      if (!silent) setRefreshing(true)
      try {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let q = supabase.from(VIEW).select('*', { count: 'exact' }).range(from, to)

        // Filtry
        if (filters.q) q = q.ilike('search', `%${filters.q.trim()}%`)
        if (filters.country) q = q.eq('country', filters.country) 
        if (filters.type !== 'all') q = q.eq('type', (filters.type as ClientType).toUpperCase())
        if (filters.returning) q = q.gt('orders_count', 1)

        // Sort (klucze snake_case)
        const sortMap: Record<SortKey, string> = {
          id: 'id',
          name: 'name',
          email: 'email',
          country: 'country',
          type: 'type',
          orders_count: 'orders_count',
          total_spent_pln: 'total_spent_pln',
          last_order_at: 'last_order_at',
          created_at: 'created_at',
        }
        if (sortKey)
          q = q.order(sortMap[sortKey], {
            ascending: sortDir === 'asc',
            nullsFirst: false,
          })
        else q = q.order('created_at', { ascending: false, nullsFirst: false }) // Domyślne

        const { data: rows, count, error } = await q
        if (error) console.error('[useClientsList] fetch error:', error)

        // Mapowanie 1:1 (ClientRow jest snake_case, co pasuje do widoku)
        setData((rows || []) as ClientRow[])
        setTotal(count || 0)
      } finally {
        if (!silent) setRefreshing(false)
      }
    },
    [page, pageSize, sortKey, sortDir, JSON.stringify(filters)] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // auto-fetch
  useEffect(() => {
    void fetchList()
  }, [fetchList])

  // realtime (throttle 2s) – ciche odświeżenie
  const lastRefreshRef = useRef(0)
  const throttledFetch = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now
      void fetchList({ silent: true })
    }
  }, [fetchList])

  useEffect(() => {
    const chOrders = supabase
      .channel('clients-orders-live')
      .on('postgres_changes', { schema: 'public', table: 'orders', event: '*' }, throttledFetch)
      .subscribe()
    const chUsers = supabase
      .channel('clients-users-live')
      .on('postgres_changes', { schema: 'public', table: 'users', event: '*' }, throttledFetch)
      .subscribe()

    return () => {
      supabase.removeChannel(chOrders)
      supabase.removeChannel(chUsers)
    }
  }, [supabase, throttledFetch])

  // jawne odświeżenie – widoczny spinner min. 600ms
  const refresh = useCallback(async () => {
    setRefreshing(true)
    const started = Date.now()
    try {
      await fetchList({ silent: false })
    } finally {
      const elapsed = Date.now() - started
      const minSpin = 600
      const delay = Math.max(0, minSpin - elapsed)
      window.setTimeout(() => setRefreshing(false), delay)
    }
  }, [fetchList])

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    sortKey,
    sortDir,
    filters,
    refreshing,

    showPageSize,
    setShowPageSize,

    setPage,
    setPageSize,

    setSortExact,
    resetSort,

    setFilters: f => {
      setPage(1)
      setFiltersState(prev => ({
        ...prev,
        ...f,
        ...(f.country !== undefined ? { country: f.country || '' } : {}),
        ...(f.type !== undefined
          ? { type: (f.type === 'all' ? 'all' : f.type) as Filters['type'] }
          : {}),
      }))
    },
    resetFilters: () => {
      setPage(1)
      resetFiltersState()
    },

    refresh,
  }
}