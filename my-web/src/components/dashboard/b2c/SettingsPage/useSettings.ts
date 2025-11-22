'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { validatePassword } from '@/utils/supabase/validators'

export type ActionResult = { success: true; message?: string } | { success: false; message: string }

type UserRow = {
	id: string
	email: string | null
	account_type: string | null
	is_verified: boolean | null
	user_code: string | null
	default_full_name: string | null
	default_phone: string | null
	default_email: string | null
	default_country: string | null
	default_city: string | null
	default_postal: string | null
	default_street: string | null
	default_apartment: string | null
}

type PwdErrors = { pwdA?: string; pwdB?: string }

// Helper do porównywania formularza z oryginałem
const checkAddressDirty = (form: Partial<UserRow>, original: UserRow | null): boolean => {
	if (!original) return false
	return (
		(form.default_full_name ?? null) !== original.default_full_name ||
		(form.default_phone ?? null) !== original.default_phone ||
		(form.default_email ?? null) !== original.default_email ||
		(form.default_country ?? null) !== original.default_country ||
		(form.default_city ?? null) !== original.default_city ||
		(form.default_postal ?? null) !== original.default_postal ||
		(form.default_street ?? null) !== original.default_street ||
		(form.default_apartment ?? null) !== original.default_apartment
	)
}

export function useSettings() {
	const supabase = useMemo(
		() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
		[]
	)

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [changingPwd, setChangingPwd] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [userRow, setUserRow] = useState<UserRow | null>(null)
	const [form, setForm] = useState<Partial<UserRow>>({})

	const [pwdA, setPwdA] = useState('')
	const [pwdB, setPwdB] = useState('')
	const [pwdErrors, setPwdErrors] = useState<PwdErrors>({})

	const reqId = useRef(0)

	// === NOWE MEMO DO ŚLEDZENIA ZMIAN ===
	const isAddressDirty = useMemo(() => checkAddressDirty(form, userRow), [form, userRow])
	const isPasswordDirty = useMemo(() => pwdA.length > 0 || pwdB.length > 0, [pwdA, pwdB])

	const fetchMe = useCallback(async () => {
		const my = ++reqId.current
		setLoading(true)
		setError(null)
		try {
			const { data: auth } = await supabase.auth.getUser()
			const uid = auth?.user?.id
			if (!uid) {
				if (my === reqId.current) {
					setUserRow(null)
					setLoading(false)
				}
				return
			}

			// ⭐️ POPRAWKA: Pobieramy 'default_full_name', 'default_phone', 'default_email'
			const { data, error: err } = await supabase
				.from('users')
				.select(
					`
id, email, account_type, is_verified,
user_code,
default_full_name, default_phone, default_email,
default_country, default_city, default_postal,
default_street, default_apartment
`
				)
				.eq('id', uid)
				.single()

			if (err) throw err
			if (my === reqId.current) {
				setUserRow(data as UserRow)
				setForm(data as UserRow) // Resetujemy formularz do stanu początkowego
			}
		} catch (e: any) {
			if (my === reqId.current) setError(e?.message ?? 'Failed to load settings')
		} finally {
			if (my === reqId.current) setLoading(false)
		}
	}, [supabase])

	useEffect(() => {
		void fetchMe()
	}, [fetchMe])

	/** Zapis adresu domyślnego – zwraca ActionResult */
	const saveDefaults = useCallback(async (): Promise<ActionResult> => {
		if (!userRow?.id) return { success: false, message: 'Not authenticated' }
		if (!isAddressDirty) return { success: false, message: 'No changes to save' }

		setSaving(true)
		setError(null)
		try {
			// ⭐️ POPRAWKA: Zapisujemy do 'default_full_name', 'default_phone', 'default_email'
			const patch = {
				default_full_name: form.default_full_name ?? null,
				default_phone: form.default_phone ?? null,
				default_email: form.default_email ?? null,
				default_country: form.default_country ?? null,
				default_city: form.default_city ?? null,
				default_postal: form.default_postal ?? null,
				default_street: form.default_street ?? null,
				default_apartment: form.default_apartment ?? null,
			}

			const { error: err } = await supabase.from('users').update(patch).eq('id', userRow.id)
			if (err) throw err

			await fetchMe() // Pobierz nowe dane, aby zresetować stan 'dirty'
			return { success: true, message: 'Your default address has been saved.' }
		} catch (e: any) {
			const msg = e?.message ?? 'Failed to save defaults'
			setError(msg)
			return { success: false, message: msg }
		} finally {
			setSaving(false)
		}
	}, [supabase, userRow?.id, form, fetchMe, isAddressDirty])

	/** Walidacja haseł – z validators */
	const validatePasswords = useCallback((): boolean => {
		const errs: PwdErrors = {}
		const v = validatePassword(pwdA)
		if (v) errs.pwdA = v.message

		if (!pwdB) errs.pwdB = 'Please confirm your password'
		else if (pwdA && pwdA !== pwdB) errs.pwdB = 'Passwords do not match'

		setPwdErrors(errs)
		return Object.keys(errs).length === 0
	}, [pwdA, pwdB])

	/** Zmiana hasła – zwraca ActionResult */
	const changePassword = useCallback(async (): Promise<ActionResult> => {
		setChangingPwd(true)
		setError(null)
		try {
			if (!validatePasswords()) return { success: false, message: 'Please fix the errors and try again.' }

			const { error: err } = await supabase.auth.updateUser({ password: pwdA })
			if (err) throw err

			setPwdA('')
			setPwdB('')
			setPwdErrors({})
			return { success: true, message: 'Your password has been changed.' }
		} catch (e: any) {
			const msg = e?.message ?? 'Failed to change password'
			setError(msg)
			return { success: false, message: msg }
		} finally {
			setChangingPwd(false)
		}
	}, [supabase, pwdA, validatePasswords])

	return {
		// stany
		loading,
		saving,
		changingPwd,
		error,

		// user
		userRow,

		// formularz domyślnego adresu
		form,
		setForm,
		saveDefaults,
		isAddressDirty, // Zwracamy flagę 'dirty'

		// hasła
		pwdA,
		pwdB,
		setPwdA,
		setPwdB,
		changePassword,
		pwdErrors,
		isPasswordDirty, // Zwracamy flagę 'dirty'
	}
}
