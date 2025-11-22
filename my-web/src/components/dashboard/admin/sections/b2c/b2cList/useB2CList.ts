// app/.../b2c/b2cList/useB2CList.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { B2COrder, Filters } from './B2CTypes'
import type { OrderStatus } from '@/utils/orderStatus'

export type SortKey =
	| 'created_at'
	| 'admin_amount_received'
	| 'admin_amount_costs'
	| 'order_fullname'
	| 'status'
	| 'country'

export type SortDir = 'asc' | 'desc'

type DbViewRow = {
	order_uuid: string
	order_number: string
	user_id: string // DODAŁEM TYP DLA user_id
	user_full_name: string | null
	user_email: string | null
	order_status: OrderStatus
	created_at: string
	order_country: string | null
	selected_carrier: string | null
	tracking_link: string | null
	items_json: { item_name: string; item_quantity: number }[] | null

	admin_amount_received: number | null
	admin_amount_costs: number | null
}

const VIEW = 'v_admin_b2c_order_list'

export function useB2CList() {
	const supabase = useMemo(
		() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
		[]
	)

	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(25)
	const [sortKey, setSortKey] = useState<SortKey>('created_at')
	const [sortDir, setSortDir] = useState<SortDir>('desc')

	const [filters, setFilters] = useState<Filters>({
		query: '',
		statuses: [],
		min_value: undefined,
		max_value: undefined,
		date_from: undefined,
		date_to: undefined,
		country: undefined,
	})

	const [data, setData] = useState<B2COrder[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const idToUuidRef = useRef<Map<string, string>>(new Map())
	const reqIdRef = useRef(0)

	const applyFilters = useCallback(
		(q: any) => {
			const { query, statuses, min_value, max_value, date_from, date_to, country } = filters

			if (query?.trim()) {
				const term = query.trim().toLowerCase()
				const orParts = [
					`order_number.ilike.%${term}%`,
					`user_full_name.ilike.%${term}%`,
					`user_email.ilike.%${term}%`,
					`order_country.ilike.%${term}%`,
				]
				q = q.or(orParts.join(','))
			}

			if (statuses?.length) q = q.in('order_status', statuses as string[])
			if (typeof min_value === 'number') q = q.gte('admin_amount_received', min_value)
			if (typeof max_value === 'number') q = q.lte('admin_amount_received', max_value)
			if (date_from) q = q.gte('created_at', new Date(`${date_from}T00:00:00.000Z`).toISOString())
			if (date_to) {
				const to = new Date(`${date_to}T00:00:00.000Z`)
				to.setUTCDate(to.getUTCDate() + 1)
				q = q.lt('created_at', to.toISOString())
			}
			if (country && country.trim()) q = q.eq('order_country', country.trim())

			return q
		},
		[filters]
	)

	const fetchPage = useCallback(
		async (opts?: { silent?: boolean }) => {
			const myId = ++reqIdRef.current
			const silent = Boolean(opts?.silent)
			if (!silent) setLoading(true)
			setError(null)

			try {
				let q = supabase.from(VIEW).select(
					`
order_id,
order_number,
user_id,
user_full_name,
user_email,
order_country,
order_status,
created_at,
selected_carrier,
tracking_link,
admin_amount_received,
admin_amount_costs,
items_json
`,
					{ count: 'exact' }
				)

				q = applyFilters(q)

				const asc = sortDir === 'asc'
				const sortMap: Record<SortKey, string> = {
					created_at: 'created_at',
					admin_amount_received: 'admin_amount_received',
					admin_amount_costs: 'admin_amount_costs',
					order_fullname: 'user_full_name',
					status: 'order_status',
					country: 'order_country',
				}
				q = q.order(sortMap[sortKey] ?? 'created_at', { ascending: asc })

				const from = (page - 1) * pageSize
				const to = from + pageSize - 1
				q = q.range(from, to)

				const { data: rawRows, count, error: qErr } = await q
				if (qErr) throw qErr
				if (myId !== reqIdRef.current) return

				let totalCount = typeof count === 'number' ? count : 0
				if (count == null) {
					let qc = supabase.from(VIEW).select('order_id', { count: 'exact', head: true })
					qc = applyFilters(qc)
					const { count: headCount, error: headErr } = await qc
					if (headErr) throw headErr
					totalCount = headCount ?? 0
				}
				setTotal(totalCount)

				const rows = (rawRows ?? []) as any[]
				idToUuidRef.current = new Map(rows.map(r => [r.order_number, r.order_id]))

				const mapped: B2COrder[] = rows.map(r => {
					const received = Number(r.admin_amount_received ?? 0)
					const costs = Number(r.admin_amount_costs ?? 0)
					const profit = received - costs

					return {
						id: r.order_number,
						order_number: r.order_number,
						user_id: r.user_id,
						order_fullname: r.user_full_name ?? '—',
						country: r.order_country ?? null,
						status: r.order_status,
						created_at: r.created_at,

						admin_amount_received: received,
						admin_amount_costs: costs,
						admin_amount_profit: profit,

						items: Array.isArray(r.items_json)
							? r.items_json.map((j: any) => ({ name: j.item_name, qty: j.item_quantity }))
							: [],

						tracking_link: r.tracking_link ?? null,
						selected_carrier: r.selected_carrier ?? null,
					}
				})

				setData(mapped)
			} catch (e: any) {
				if (myId === reqIdRef.current) setError(e?.message ?? 'Unknown error')
			} finally {
				if (myId === reqIdRef.current && !silent) setLoading(false)
			}
		},
		[supabase, page, pageSize, sortKey, sortDir, applyFilters]
	)

	useEffect(() => {
		void fetchPage()
	}, [fetchPage])

	const lastRefreshRef = useRef(0)
	const throttledFetch = useCallback(() => {
		const now = Date.now()
		if (now - lastRefreshRef.current > 2000) {
			lastRefreshRef.current = now
			void fetchPage({ silent: true })
		}
	}, [fetchPage])

	useEffect(() => {
		const tables = ['orders', 'order_items', 'order_payment', 'order_quotes']
		const channels = tables.map(tbl =>
			supabase
				.channel(`${tbl}-live`)
				.on('postgres_changes', { schema: 'public', table: tbl, event: '*' }, throttledFetch)
				.subscribe()
		)
		return () => channels.forEach(ch => supabase.removeChannel(ch))
	}, [supabase, throttledFetch])

	const totalPages = Math.max(1, Math.ceil(total / pageSize))

	const updateOrderAmounts = useCallback(
		async (displayId: string, amounts: { received_pln?: number; cost_pln?: number }) => {
			const orderUuid = idToUuidRef.current.get(displayId)
			if (!orderUuid) return { ok: false, error: 'Order UUID not found' }

			const current = data.find(o => o.id === displayId)
			if (!current) return { ok: false, error: 'Order not loaded' }

			const clamp = (n: unknown, fallback: number) => {
				const v = typeof n === 'number' ? n : Number(n)
				return Number.isFinite(v) ? Math.round(v * 100) / 100 : fallback
			}

			const received = clamp(amounts.received_pln, current.admin_amount_received)
			const costs = clamp(amounts.cost_pln, current.admin_amount_costs)
			const profit = received - costs

			const prevData = data
			setData(prev =>
				prev.map(o =>
					o.id === displayId
						? { ...o, admin_amount_received: received, admin_amount_costs: costs, admin_amount_profit: profit }
						: o
				)
			)

			const { error: upErr } = await supabase
				.from('order_payment')
				.upsert(
					{ order_id: orderUuid, admin_amount_received: received, admin_amount_costs: costs },
					{ onConflict: 'order_id' }
				)

			if (upErr) {
				setData(prevData)
				return { ok: false, error: upErr.message }
			}

			await fetchPage({ silent: true })
			return { ok: true }
		},
		[data, supabase, fetchPage]
	)

	const refresh = useCallback(async () => {
		setRefreshing(true)
		const start = Date.now()
		await fetchPage({ silent: false })
		const elapsed = Date.now() - start
		setTimeout(() => setRefreshing(false), Math.max(0, 600 - elapsed))
	}, [fetchPage])

	return {
		data,
		total,
		page,
		totalPages,
		pageSize,
		setPage,
		setPageSize,

		sortKey,
		sortDir,
		setSort: (k: SortKey) => {
			setPage(1)
			setSortDir(prev => (k === sortKey ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'))
			setSortKey(k)
		},
		setSortExact: (k: SortKey, dir: SortDir) => {
			setPage(1)
			setSortKey(k)
			setSortDir(dir)
		},
		resetSort: () => {
			setPage(1)
			setSortKey('created_at')
			setSortDir('desc')
		},

		filters,
		setFilters,
		toggleStatus: (st: OrderStatus) =>
			setFilters(prev => ({
				...prev,
				statuses: prev.statuses.includes(st) ? prev.statuses.filter(s => s !== st) : [...prev.statuses, st],
			})),
		resetFilters: () =>
			setFilters({
				query: '',
				statuses: [],
				min_value: undefined,
				max_value: undefined,
				date_from: undefined,
				date_to: undefined,
				country: undefined,
			}),

		loading,
		refreshing,
		error,

		refresh,
		updateOrderAmounts,
	}
}

export type ListCtrl = ReturnType<typeof useB2CList>
