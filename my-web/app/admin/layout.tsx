'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { attachActiveSectionAttr } from '@/components/dashboard/admin/utils/setActiveSectionAttr'

type GateStatus = 'checking' | 'ok'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )
  const [status, setStatus] = useState<GateStatus>('checking')
  const navigated = useRef(false)

  useEffect(() => {
    const detach = attachActiveSectionAttr('dashboard')
    return detach
  }, [])

  useEffect(() => {
    let alive = true
    const tick = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!alive) return
      const exp = (session as any)?.expires_at as number | undefined
      const now = Math.floor(Date.now() / 1000)
      if (session && (!exp || exp - now < 90)) {
        try { await supabase.auth.refreshSession() } catch {}
      }
    }
    const t = setInterval(tick, 45_000)
    tick()
    const onFocus = () => tick()
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [supabase])

  useEffect(() => {
    let unmounted = false
    const go = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (unmounted) return

      if (!session) {
        if (!navigated.current) { navigated.current = true; router.replace('/login') }
        setStatus('ok')
        return
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('assigned_sections')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (unmounted) return

      if (error || !data) {
        if (!navigated.current) { navigated.current = true; router.replace('/dashboard') }
        setStatus('ok')
        return
      }

      const sections = Array.isArray(data.assigned_sections)
        ? data.assigned_sections.map((s: any) => String(s).toLowerCase())
        : []

      const hasAny = sections.includes('all') || sections.length > 0
      if (!hasAny) {
        if (!navigated.current) { navigated.current = true; router.replace('/dashboard') }
        setStatus('ok')
        return
      }

      setStatus('ok')
    }

    go()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (unmounted) return
      if (event === 'SIGNED_OUT') {
        if (!navigated.current) { navigated.current = true; router.replace('/login') }
        setStatus('ok')
        return
      }
      if (!s) {
        const { data: again } = await supabase.auth.getSession()
        if (!again.session && !navigated.current) {
          navigated.current = true
          router.replace('/login')
        }
        setStatus('ok')
        return
      }
      setStatus('ok')
    })

    return () => {
      unmounted = true
      authListener?.subscription?.unsubscribe()
    }
  }, [router, supabase])

  if (status !== 'ok') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red" />
      </div>
    )
  }

  return <>{children}</>
}
