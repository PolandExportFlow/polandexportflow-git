'use client'

import { useState, useCallback } from 'react'
import type { AddressModel } from '../requestTypes' // Używamy AddressModel

// Skopiowane z Twojego pliku useAddress.ts
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

export function useDefaultAddress() {
	const [isLoading, setLoading] = useState(false)

	const loadDefaultAddress = useCallback(async () => {
		setLoading(true)
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

			const patch = (await res.json()) as Partial<AddressModel>

			if (!patch || Object.keys(patch).length === 0) {
				throw new Error('No default address data found for user')
			}
			return patch
		} catch (e) {
			console.error(e)
			throw e
		} finally {
			setLoading(false)
		}
	}, [])

	return { loadDefaultAddress, isLoading }
}
