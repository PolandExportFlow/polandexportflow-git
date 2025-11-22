'use client'

import { useCallback, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { AdminProfile, OrderBrief, FileItem, ClientAnalytics } from './AdminProfileTypes'

type RpcProfilePayload = any

const nn = <T,>(v: T | null | undefined): T | undefined =>
    v === null || typeof v === 'undefined' ? undefined : (v as T)

// ZMIANA 1: Funkcja może teraz zwrócić 'null', jeśli dane wejściowe są nieprawidłowe
function normalizeFromRpc(raw: RpcProfilePayload): AdminProfile | null {
    const p = raw?.profile || raw

    // KRYTYCZNA POPRAWKA:
    // Jeśli 'p' (profil) nie istnieje lub nie ma 'id', dane są bezużyteczne.
    // Zwracamy 'null' zamiast tworzyć obiekt-zombie z id: "undefined".
    if (!p || !p.id) {
        return null
    }
    
    // ZMIANA: Dodajemy 'order_number' do normalizacji OrderBrief
    const orders: OrderBrief[] = (raw?.orders || []).map((o: any) => ({
        id: o.id, 
        order_number: o.order_number, // <--- DODANE POLE
        created_at: o.created_at, 
        order_status: o.order_status,
    }))
    
    const files: FileItem[] = (raw?.files || []).map((f: any) => ({
        id: f.id, 
        storage_path: f.storage_path, 
        file_name: f.file_name, 
        mime_type: f.mime_type, 
        created_at: f.created_at,
    }))
    
    const analytics: ClientAnalytics = {
        lifetime_value_pln: Number(raw?.analytics?.lifetime_value_pln ?? 0),
        avg_order_value_pln: Number(raw?.analytics?.avg_order_value_pln ?? 0),
        orders_count: Number(raw?.analytics?.orders_count ?? orders.length ?? 0),
        first_order_at: raw?.analytics?.first_order_at, 
        last_order_at: raw?.analytics?.last_order_at,
    }
    
    return {
        id: String(p.id), // Teraz mamy pewność, że p.id istnieje
        account_type: nn<string>(p.account_type), 
        created_at: p.created_at, 

        full_name: nn<string>(p.full_name), 
        email: nn<string>(p.email), 
        phone: nn<string>(p.phone), 
        
        address: {
            default_full_name: nn<string>(p.default_full_name), 
            default_email: nn<string>(p.default_email), 
            default_phone: nn<string>(p.default_phone), 
            default_country: nn<string>(p.default_country),
            default_city: nn<string>(p.default_city),
            default_postal: nn<string>(p.default_postal), 
            default_street: nn<string>(p.default_street), 
            default_apartment: nn<string>(p.default_apartment),
        },
        
        is_verified: p.is_verified,
        user_code: nn<string>(p.user_code),
        
        admin_note: nn<string>(p.admin_note), 
        orders, // Używamy nowej, rozszerzonej listy
        files, 
        analytics,
    }
}

export function useAdminProfileModal() {
    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        []
    )

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<AdminProfile | null>(null)
    const [lastUserId, setLastUserId] = useState<string | null>(null)

    const loadForUser = useCallback(
        async (userId: string, opts?: { ordersLimit?: number; filesLimit?: number }) => {
            setLoading(true)
            setError(null)
            setLastUserId(userId)
            
            // ZMIANA 2: Czyścimy stary profil, aby nie było "mignięcia" starych danych
            // To rozwiąże problem z wyścigiem (race condition)
            setProfile(null) 
            
            const startTime = Date.now();
            const minimumLoadTime = 300; 

            try {
                const { data, error } = await supabase.rpc('admin_get_modal_profile', {
                    p_user_id: userId,
                    p_limit_orders: opts?.ordersLimit ?? 30,
                    p_limit_files: opts?.filesLimit ?? 24,
                })
                if (error) throw error
                
                const rpcPayload = Array.isArray(data) && data.length > 0 ? data[0] : data;
                
                // ZMIANA 3: Sprawdzamy, czy normalizacja się udała
                const normalizedProfile = normalizeFromRpc(rpcPayload as RpcProfilePayload);

                if (!normalizedProfile) {
                    // Wymuś błąd, jeśli normalizacja zwróciła null
                    // (co się stanie, jeśli RPC zwróci puste/złe dane dla usera)
                    throw new Error('Failed to normalize profile. RPC payload might be invalid or empty for this user.');
                }
                
                setProfile(normalizedProfile) // Ustawiamy tylko w pełni poprawny profil
            } catch (e: any) {
                setError(e?.message ?? 'Błąd pobierania profilu')
                setProfile(null) // Upewnij się, że profil jest null po błędzie
            } finally {
                const elapsed = Date.now() - startTime;
                const delayTime = Math.max(0, minimumLoadTime - elapsed);
                
                if (delayTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                }
                
                setLoading(false)
            }
        },
        [supabase]
    )

    const openByUserId = useCallback(
        async (userId: string) => {
            await loadForUser(userId)
        },
        [loadForUser]
    )

    const refreshProfile = useCallback(
        async (userId: string) => {
            await loadForUser(userId)
        },
        [loadForUser]
    )

    const saveNote = useCallback(
        async (userId: string, note: string): Promise<string> => {
            const { data, error } = await supabase.rpc('admin_user_profile_update_admin_note', {
                p_user_id: userId,
                p_notes: note ?? '',
            })
            if (error) throw error

            const payload = Array.isArray(data) ? data[0] : data
            const serverNote = String(payload?.admin_note ?? note ?? '')

            setProfile(p => (p && p.id === userId ? { ...p, admin_note: serverNote } : p))
            return serverNote
        },
        [supabase]
    )

    return {
        loading, 
        error,
        profile,
        loadForUser,
        openByUserId,
        refresh: refreshProfile,
        saveNote,
    }
}