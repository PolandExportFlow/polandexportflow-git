'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function useB2COrdersStats() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [stats, setStats] = useState({
    total: 0,
    pending_quotes: 0,
    in_progress: 0,
    shipped: 0,
    delivered: 0,
  })

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.from('v_admin_stats_b2c_orders').select('*').single()
    if (!error && data) setStats(data)
  }, [supabase])

  // realtime — ciche odświeżenie
  const lastRef = useRef(0)
  const throttled = useCallback(() => {
    const now = Date.now()
    if (now - lastRef.current > 2000) {
      lastRef.current = now
      void fetchStats()
    }
  }, [fetchStats])

  useEffect(() => {
    void fetchStats()
    const ch = supabase
      .channel('b2c-orders-stats')
      .on('postgres_changes', { schema: 'public', table: 'orders', event: '*' }, throttled)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, fetchStats, throttled])

  return stats
}
