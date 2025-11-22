'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientOrderModalPayload, AddressPanelDB } from './clientOrderTypes'

type State = {
    loading: boolean
    refreshing: boolean
    data: ClientOrderModalPayload | null
    error: string | null
    lastUpdatedAt: number | null
}

type Options = { endpoint?: string }
type FetchOpts = { soft?: boolean }

export function useClientOrderModal(lookup: string | null | undefined, enabled = true, opts: Options = {}) {
    const endpoint = opts.endpoint ?? '/api/rpc/user_get_modal_order'

    const [state, setState] = useState<State>({
        loading: true,
        refreshing: false,
        data: null,
        error: null,
        lastUpdatedAt: null,
    })

    const mountedRef = useRef(false)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const safeSet = useCallback((patch: Partial<State>) => {
        if (!mountedRef.current) return
        setState(prev => ({ ...prev, ...patch }))
    }, [])

    const lookupSanitized = (lookup ?? '').replace(/^#/, '').trim()
    const hasLookup = enabled && lookupSanitized.length > 0

    const abortRef = useRef<AbortController | null>(null)
    const requestIdRef = useRef(0)

    const fetchOnce = useCallback(
        async ({ soft = false }: FetchOpts = {}) => {
            if (!hasLookup) {
                safeSet({ loading: false, refreshing: false, data: null, error: null })
                return
            }
            abortRef.current?.abort()
            const ctrl = new AbortController()
            abortRef.current = ctrl
            const rid = ++requestIdRef.current

            if (!soft) safeSet({ loading: true, error: null })
            else safeSet({ error: null })

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lookup: lookupSanitized }),
                    signal: ctrl.signal,
                    cache: 'no-store',
                })
                if (rid !== requestIdRef.current) return

                if (res.status === 204 || res.status === 404) {
                    safeSet({ loading: false, refreshing: false, data: null, error: 'Order not found' })
                    return
                }
                if (res.status === 401) {
                    safeSet({ loading: false, refreshing: false, data: null, error: 'Unauthorized' })
                    return
                }
                if (!res.ok) {
                    let details = ''
                    try {
                        const j = await res.json()
                        details = j?.error || JSON.stringify(j)
                    } catch {
                        try {
                            details = await res.text()
                        } catch {
                            details = ''
                        }
                    }
                    safeSet({
                        loading: false,
                        refreshing: false,
                        data: null,
                        error: `RPC failed (${res.status})${details ? `: ${details}` : ''}`,
                    })
                    return
                }

                const json = (await res.json()) as ClientOrderModalPayload | null
                safeSet({
                    loading: false,
                    refreshing: false,
                    data: json,
                    error: null,
                    lastUpdatedAt: Date.now(),
                })
            } catch (err: unknown) {
                if ((err as any)?.name === 'AbortError') return
                const msg =
                    typeof err === 'object' && err && 'message' in (err as any) ? String((err as any).message) : 'Network error'
                safeSet({ loading: false, refreshing: false, error: msg })
            }
        },
        [endpoint, hasLookup, lookupSanitized, safeSet]
    )

    useEffect(() => {
        void fetchOnce({ soft: false })
        return () => abortRef.current?.abort()
    }, [fetchOnce])

    const refresh = useCallback(async () => {
        if (!hasLookup) return
        safeSet({ refreshing: true })
        try {
            await fetchOnce({ soft: false })
        } finally {
            safeSet({ refreshing: false })
        }
    }, [hasLookup, fetchOnce, safeSet])

    const refreshSoft = useCallback(async () => {
        if (!hasLookup) return
        await fetchOnce({ soft: true })
    }, [hasLookup, fetchOnce])

    useEffect(() => {
        const onUpdated = (e: Event) => {
            const detail = (e as CustomEvent<{ orderNumber?: string | null }>).detail
            if (!detail?.orderNumber) {
                void refreshSoft()
                return
            }
            const same = detail.orderNumber.replace(/^#/, '').trim() === lookupSanitized
            if (same) void refreshSoft()
        }
        window.addEventListener('pef:order:updated', onUpdated as EventListener)
        return () => window.removeEventListener('pef:order:updated', onUpdated as EventListener)
    }, [lookupSanitized, refreshSoft])

    const clearError = useCallback(() => {
        safeSet({ error: null })
    }, [safeSet])

    const addLocalItem = useCallback((row: ClientOrderModalPayload['itemsPanel'][number]) => {
        setState(prev => {
            if (!prev.data) return prev
            const exists = prev.data.itemsPanel.some(i => String(i.id) === String(row.id))
            const nextItems = exists ? prev.data.itemsPanel : [row, ...prev.data.itemsPanel]
            return { ...prev, data: { ...prev.data, itemsPanel: nextItems } }
        })
    }, [])

    const replaceLocalItem = useCallback((tempId: string, realRow: ClientOrderModalPayload['itemsPanel'][number]) => {
        setState(prev => {
            if (!prev.data) return prev
            const nextItems = prev.data.itemsPanel.map(i => (String(i.id) === String(tempId) ? realRow : i))
            const stillMissing = !nextItems.some(i => String(i.id) === String(realRow.id))
            const finalItems = stillMissing ? [realRow, ...nextItems.filter(i => String(i.id) !== String(tempId))] : nextItems
            return { ...prev, data: { ...prev.data, itemsPanel: finalItems } }
        })
    }, [])

    const updateLocalItem = useCallback(
        (itemId: string, patch: Partial<ClientOrderModalPayload['itemsPanel'][number]>) => {
            setState(prev => {
                if (!prev.data) return prev
                const idx = prev.data.itemsPanel.findIndex(it => String(it.id) === String(itemId))
                if (idx === -1) {
                    const newRow = { id: itemId, ...patch } as ClientOrderModalPayload['itemsPanel'][number]
                    return { ...prev, data: { ...prev.data, itemsPanel: [newRow, ...prev.data.itemsPanel] } }
                }
                const nextItems = prev.data.itemsPanel.map(it => (String(it.id) === String(itemId) ? { ...it, ...patch } : it))
                return { ...prev, data: { ...prev.data, itemsPanel: nextItems } }
            })
        },
        []
    )

    const removeLocalItem = useCallback((itemId: string) => {
        setState(prev => {
            if (!prev.data) return prev
            const nextItems = prev.data.itemsPanel.filter(it => String(it.id) !== String(itemId))
            return { ...prev, data: { ...prev.data, itemsPanel: nextItems } }
        })
    }, [])

    const updateLocalAddress = useCallback((patch: Partial<AddressPanelDB>) => {
        setState(prev => {
            if (!prev.data) return prev
            return { ...prev, data: { ...prev.data, addressPanel: { ...prev.data.addressPanel, ...patch } } }
        })
    }, [])

    const modalProps = useMemo(() => state.data ?? null, [state.data])

    return {
        loading: state.loading,
        refreshing: state.refreshing,
        data: state.data,
        error: state.error,
        lastUpdatedAt: state.lastUpdatedAt,

        hasLookup,
        lookupSanitized,
        clearError,

        refresh,
        refreshSoft,
        modalProps,

        addLocalItem,
        replaceLocalItem,
        updateLocalItem,
        removeLocalItem,
        updateLocalAddress,
    }
}

export type UseClientOrderModalReturn = ReturnType<typeof useClientOrderModal>