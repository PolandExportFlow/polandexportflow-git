'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveTracking } from '../panels/AddressPanel/tracking.service'
import { getTrackingLink } from '@/utils/getTrackingLink'

type Args = {
	lookup: string
	/** tylko do budowy linku w UI */
	carrierKeyOrName?: string | null
	/** kod lub URL z backendu (może przyjść później) */
	initialCode?: string
	autoSave?: boolean
	debounceMs?: number
}

// ——— helpers ———
function extractTrackingCode(v: string) {
	const s = (v ?? '').trim()
	if (!s) return ''
	// Poczta Polska (?numer=XXXX)
	const mPP = s.match(/[?&]numer=([^&#]+)/i)
	if (mPP?.[1]) return decodeURIComponent(mPP[1])
	// Ogólny fallback: weź ostatni „token” bez spacji/znaków specjalnych
	const mLast = s.match(/([A-Za-z0-9._-]+)$/)
	return mLast?.[1] || s
}

export function useTracking({ lookup, carrierKeyOrName, initialCode = '', autoSave = true, debounceMs = 600 }: Args) {
	const [code, setCode] = useState(initialCode)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	// gdy z backendu przyjdzie URL — w inpucie pokaż sam kod
	useEffect(() => {
		setCode(extractTrackingCode(initialCode ?? ''))
	}, [initialCode])

	// link tylko do UI (otwórz/kopiuj)
	const link = useMemo(() => {
		const c = (code ?? '').trim()
		if (!c) return null
		return getTrackingLink(carrierKeyOrName ?? '', c)
	}, [carrierKeyOrName, code])

	// krótkie “zapisano”
	const okRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const flashSaved = useCallback(() => {
		if (okRef.current) clearTimeout(okRef.current)
		setSaved(true)
		okRef.current = setTimeout(() => setSaved(false), 1200)
	}, [])
	useEffect(
		() => () => {
			if (okRef.current) clearTimeout(okRef.current)
		},
		[]
	)

	const commit = useCallback(async () => {
		const lk = (lookup ?? '').trim()
		if (!lk) {
			console.warn('[useTracking] missing lookup')
			return
		}
		// KLUCZ: zapisujemy PEŁNY LINK; jeśli nie powstał – zapisz sam kod
		const payload = (link ?? code ?? '').trim() || null

		setSaving(true)
		try {
			await saveTracking({ lookup: lk, code: payload as string })
			flashSaved()
		} catch (e) {
			console.error('[useTracking] commit error:', e)
		} finally {
			setSaving(false)
		}
	}, [lookup, code, link, flashSaved])

	// autosave z debounce podczas pisania
	const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const setCodeAndMaybeSave = useCallback(
		(val: string) => {
			setCode(val ?? '')
			if (!autoSave) return
			if (debRef.current) clearTimeout(debRef.current)
			debRef.current = setTimeout(() => {
				void commit()
			}, debounceMs)
		},
		[autoSave, debounceMs, commit]
	)
	useEffect(
		() => () => {
			if (debRef.current) clearTimeout(debRef.current)
		},
		[]
	)

	const onBlur = useCallback(async () => {
		if (debRef.current) {
			clearTimeout(debRef.current)
			debRef.current = null
		}
		if (autoSave) await commit()
	}, [autoSave, commit])

	const onKeyDown = useCallback(
		async (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				if (debRef.current) {
					clearTimeout(debRef.current)
					debRef.current = null
				}
				await commit()
			}
		},
		[commit]
	)

	return {
		code, // to widzi input (sam kod)
		link, // pełny URL (UI-only)
		saving,
		saved,
		setCode: setCodeAndMaybeSave,
		onBlur,
		onKeyDown,
		commit,
	}
}

export type UseTracking = ReturnType<typeof useTracking>
