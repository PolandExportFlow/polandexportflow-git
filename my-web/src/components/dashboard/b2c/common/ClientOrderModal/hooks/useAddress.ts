'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { AddressPanelDB } from '../clientOrderTypes'

const ENDPOINT_UPDATE = '/api/rpc/user_order_update_address'
const ENDPOINT_GET_DEFAULT = '/api/rpc/user_get_default_address'

async function readError(res: Response) {
    try {
        const j = await res.json()
        if (j?.error) return String(j.error)
        if (j?.message) return String(j.message)
        return JSON.stringify(j)
    } catch {
        try {
            return await res.text()
        } catch {
            return ''
        }
    }
}

export function useAddress() {
    const { updateLocalAddress, refreshSoft } = useClientOrderModalCtx()

    const updateAddress = useCallback(
        async (orderNumber: string, patch: Partial<AddressPanelDB>) => {
            updateLocalAddress?.(patch)

            try {
                const res = await fetch(ENDPOINT_UPDATE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lookup: orderNumber, patch }),
                })

                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`user_order_update_address failed (${res.status})${msg ? `: ${msg}` : ''}`)
                }
            } catch (e) {
                await refreshSoft?.()
                throw e
            }
        },
        [updateLocalAddress, refreshSoft]
    )

    const loadAndSetDefaultAddress = useCallback(
        async (orderNumber: string) => {
            let patch: Partial<AddressPanelDB>

            try {
                const res = await fetch(ENDPOINT_GET_DEFAULT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-store',
                })

                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`user_get_default_address failed (${res.status})${msg ? `: ${msg}` : ''}`)
                }

                patch = (await res.json()) as Partial<AddressPanelDB>

                if (!patch || Object.keys(patch).length === 0) {
                    throw new Error('No default address data found for user')
                }
            } catch (e) {
                console.error(e)
                throw e
            }

            try {
                await updateAddress(orderNumber, patch)
            } catch (e) {
                console.error('Failed to apply default address to order', e)
                throw e
            }
        },
        [updateAddress]
    )

    return { updateAddress, loadAndSetDefaultAddress }
}