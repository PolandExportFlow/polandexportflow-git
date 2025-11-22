// app/.../sections/clients/useClientsStats.ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ZMIANA: Używamy snake_case, aby być zgodnym z widokiem SQL
type ClientsKpis = {
  total: number
  returning: number
  b2c: number
  b2b: number
  active30d: number
}

export function useClientsStats() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [kpis, setKpis] = useState<ClientsKpis>({
    total: 0, returning: 0, b2c: 0, b2b: 0, active30d: 0,
  })

  const fetchKpis = useCallback(async () => {
    // UWAGA: Zakładamy, że pola w widoku to: total, returning, b2c, b2b, active30d
    const { data, error } = await supabase.from('v_admin_stats_clients').select('*').single()
    if (!error && data) setKpis(data as ClientsKpis)
  }, [supabase])

  // realtime (throttle 2s)
  const last = useRef(0)
  const throttled = useCallback(() => {
    const now = Date.now()
    if (now - last.current > 2000) { last.current = now; void fetchKpis() }
  }, [fetchKpis])

  useEffect(() => {
    void fetchKpis()
    const ch1 = supabase
      .channel('clients-orders-live')
      .on('postgres_changes', { schema: 'public', table: 'orders', event: '*' }, throttled)
      .subscribe()
    const ch2 = supabase
      .channel('clients-users-live')
      .on('postgres_changes', { schema: 'public', table: 'users', event: '*' }, throttled)
      .subscribe()
    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [supabase, fetchKpis, throttled])

  return kpis
}