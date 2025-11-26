'use client'

import { useCallback } from 'react'
import { useClientOrderModalCtx } from '../ClientOrderModal.ctx'
import type { AddressPanelDB } from '../clientOrderTypes'

const ENDPOINT_UPDATE = '/api/rpc/user_order_update_address'
const ENDPOINT_GET_DEFAULT = '/api/rpc/user_get_default_address'

async function readError(res: Response) {
    try {
        const j = await res.json()
        return j?.error || j?.message || JSON.stringify(j)
    } catch { return await res.text().catch(() => '') }
}

export function useAddress() {
    const { orderId, updateLocalAddress, refreshSoft } = useClientOrderModalCtx()

    const updateAddress = useCallback(
        async (patch: Partial<AddressPanelDB>) => {
            if (!orderId) return
            
            // 1. Optimistic
            updateLocalAddress?.(patch)

            try {
                // 2. RPC
                const res = await fetch(ENDPOINT_UPDATE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lookup: orderId, patch }),
                })

                if (!res.ok) {
                    const msg = await readError(res)
                    throw new Error(`Update address failed: ${msg}`)
                }
            } catch (e) {
                console.error(e)
                // 3. Revert / Sync on error
                await refreshSoft?.()
                throw e
            }
        },
        [orderId, updateLocalAddress, refreshSoft]
    )

    const loadAndSetDefaultAddress = useCallback(async () => {
        if (!orderId) return
        try {
            const res = await fetch(ENDPOINT_GET_DEFAULT, { method: 'POST' })
            if (!res.ok) throw new Error('Failed to get default address')
            
            const patch = (await res.json()) as Partial<AddressPanelDB>
            if (!patch || !Object.keys(patch).length) throw new Error('No default address found')
            
            await updateAddress(patch)
        } catch (e) {
            console.error('Default address error', e)
            throw e
        }
    }, [orderId, updateAddress])

    return { updateAddress, loadAndSetDefaultAddress }
}