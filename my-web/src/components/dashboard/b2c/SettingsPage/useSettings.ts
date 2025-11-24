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

const norm = (v: string | null | undefined) => (v || '').trim()

const checkAddressDirty = (form: Partial<UserRow>, original: UserRow | null): boolean => {
    if (!original) return false
    return (
        norm(form.default_full_name) !== norm(original.default_full_name) ||
        norm(form.default_phone) !== norm(original.default_phone) ||
        norm(form.default_email) !== norm(original.default_email) ||
        norm(form.default_country) !== norm(original.default_country) ||
        norm(form.default_city) !== norm(original.default_city) ||
        norm(form.default_postal) !== norm(original.default_postal) ||
        norm(form.default_street) !== norm(original.default_street) ||
        norm(form.default_apartment) !== norm(original.default_apartment)
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

            // ⭐️ ZMIANA: .maybeSingle() zamiast .single() - nie wywala błędu jak jest 0 wierszy (choć nie powinno)
            const { data, error: err } = await supabase
                .from('users')
                .select(`
                    id, email, account_type, is_verified,
                    user_code,
                    default_full_name, default_phone, default_email,
                    default_country, default_city, default_postal,
                    default_street, default_apartment
                `)
                .eq('id', uid)
                .maybeSingle()

            if (err) throw err
            if (my === reqId.current && data) {
                setUserRow(data as UserRow)
                setForm(data as UserRow)
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

    const saveDefaults = useCallback(async (): Promise<ActionResult> => {
        if (!userRow?.id) return { success: false, message: 'Not authenticated' }
        if (!isAddressDirty) return { success: false, message: 'No changes to save' }

        setSaving(true)
        setError(null)
        try {
            const clean = (v: string | null | undefined) => (v && v.trim() !== '' ? v.trim() : null)

            const patch = {
                default_full_name: clean(form.default_full_name),
                default_phone: clean(form.default_phone),
                default_email: clean(form.default_email),
                default_country: clean(form.default_country),
                default_city: clean(form.default_city),
                default_postal: clean(form.default_postal),
                default_street: clean(form.default_street),
                default_apartment: clean(form.default_apartment),
            }

            // ⭐️ ZMIANA: Bezpieczny zapis - pobieramy tablicę
            const { data, error: err } = await supabase
                .from('users')
                .update(patch)
                .eq('id', userRow.id)
                .select()

            if (err) throw err

            if (data && data.length > 0) {
                const updatedItem = data[0] as UserRow
                const merged = { ...userRow, ...updatedItem }
                setUserRow(merged)
                setForm(merged)
                return { success: true, message: 'Your default address has been saved.' }
            } else {
                // Fallback: jeśli select nic nie zwrócił, ale nie było błędu
                await fetchMe()
                return { success: true, message: 'Saved (reloaded data).' }
            }
        } catch (e: any) {
            const msg = e?.message ?? 'Failed to save defaults'
            setError(msg)
            return { success: false, message: msg }
        } finally {
            setSaving(false)
        }
    }, [supabase, userRow, form, fetchMe, isAddressDirty])

    const validatePasswords = useCallback((): boolean => {
        const errs: PwdErrors = {}
        if (pwdA.length < 6) errs.pwdA = 'Password is too short (min 6 chars)'
        if (!pwdB) errs.pwdB = 'Please confirm your password'
        else if (pwdA && pwdA !== pwdB) errs.pwdB = 'Passwords do not match'
        setPwdErrors(errs)
        return Object.keys(errs).length === 0
    }, [pwdA, pwdB])

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
        loading,
        saving,
        changingPwd,
        error,
        userRow,
        form,
        setForm,
        saveDefaults,
        isAddressDirty,
        pwdA,
        pwdB,
        setPwdA,
        setPwdB,
        changePassword,
        pwdErrors,
        isPasswordDirty,
    }
}