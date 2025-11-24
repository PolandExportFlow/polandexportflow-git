'use client'

import { useState, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { AddressModel } from '../requestTypes'

export function useDefaultAddress() {
    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        []
    )
    const [isLoading, setLoading] = useState(false)

    const loadDefaultAddress = useCallback(async (): Promise<Partial<AddressModel>> => {
        setLoading(true)
        try {
            // 1. Pobieramy usera, żeby mieć pewność sesji
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) throw new Error('User not authenticated')

            // 2. Wywołujemy RPC bezpośrednio przez klienta Supabase
            // Funkcja SQL 'user_get_default_address' powinna zwracać wiersz z kolumnami default_*
            const { data, error } = await supabase.rpc('user_get_default_address')

            if (error) throw error

            // Jeśli brak danych lub pusty obiekt
            if (!data || Object.keys(data).length === 0) {
                // Opcjonalnie: Spróbujmy pobrać bezpośrednio z tabeli users jako fallback
                const { data: tableData, error: tableError } = await supabase
                    .from('users')
                    .select('default_full_name, default_phone, default_email, default_country, default_city, default_postal, default_street, default_apartment')
                    .eq('id', user.id)
                    .single()
                
                if (tableError || !tableData) {
                    throw new Error('No default address data found')
                }
                // Nadpisujemy data danymi z tabeli, jeśli RPC zawiodło/zwróciło nic
                // (to pomaga, jeśli funkcja RPC jest źle napisana)
                return mapDatabaseToModel(tableData)
            }

            return mapDatabaseToModel(data)

        } catch (e) {
            console.error('Failed to load default address:', e)
            // Zwracamy pusty obiekt, żeby nie blokować UI błędem, ale AddressStep wyświetli komunikat
            return {}
        } finally {
            setLoading(false)
        }
    }, [supabase])

    return { loadDefaultAddress, isLoading }
}

// Helper mapujący nazwy z bazy (default_*) na nazwy formularza (order_*)
function mapDatabaseToModel(data: any): Partial<AddressModel> {
    return {
        order_fullname: data.default_full_name || data.order_fullname || '',
        order_phone: data.default_phone || data.order_phone || '',
        order_email: data.default_email || data.order_email || '',
        order_country: data.default_country || data.order_country || '',
        order_city: data.default_city || data.order_city || '',
        order_postal_code: data.default_postal || data.order_postal_code || '',
        order_street: data.default_street || data.order_street || '',
        order_house_number: data.default_apartment || data.order_house_number || '',
        order_delivery_notes: '', // Tego zazwyczaj nie ma w defaultach
    }
}