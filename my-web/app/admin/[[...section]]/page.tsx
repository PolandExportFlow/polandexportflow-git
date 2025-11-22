'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/components/dashboard/admin/AdminDashboard'
import type { AdminUser } from '@/components/dashboard/admin/types'

let ADMIN_CACHE: { uid: string; user: AdminUser | null } | null = null

export default function AdminPage() {
  const router = useRouter()
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  )

  const [session, setSession] = useState<any>(undefined)
  const [adminUser, setAdminUser] = useState<AdminUser | null | undefined>(undefined)
  const [adminLoading, setAdminLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) setSession(data.session ?? null)
    })()
    const { data } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') { setSession(null); ADMIN_CACHE = null; return }
      if (s) { setSession(s); return }
      const { data: again } = await supabase.auth.getSession()
      setSession(again.session ?? null)
    })
    return () => {
      mounted = false
      data?.subscription?.unsubscribe?.()
    }
  }, [supabase])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const uid = session?.user?.id
      if (!uid) { 
        if (alive) setAdminLoading(true)
        return
      }
      if (ADMIN_CACHE && ADMIN_CACHE.uid === uid) {
        setAdminUser(ADMIN_CACHE.user)
        setAdminLoading(false)
        try {
          const fresh = await loadAdmin(supabase, uid)
          ADMIN_CACHE = { uid, user: fresh }
          if (alive) setAdminUser(fresh)
        } catch {
          try {
            await supabase.auth.refreshSession()
            const fresh = await loadAdmin(supabase, uid)
            ADMIN_CACHE = { uid, user: fresh }
            if (alive) setAdminUser(fresh)
          } catch {}
        }
        return
      }
      try {
        setAdminLoading(true)
        const user = await loadAdmin(supabase, uid)
        ADMIN_CACHE = { uid, user }
        if (alive) setAdminUser(user)
      } catch {
        if (alive) setAdminUser(null)
      } finally {
        if (alive) setAdminLoading(false)
      }
    })()
    return () => { alive = false }
  }, [session, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    ADMIN_CACHE = null
    router.push('/')
  }

  if (adminLoading || adminUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red" />
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-light-blue flex items-center justify-center">
        <div className="text-center">
          <h2>Brak dostępu</h2>
        </div>
      </div>
    )
  }

  return (
    <AdminDashboard
      adminUser={adminUser}
      onSignOut={handleSignOut}
    />
  )
}

async function loadAdmin(
  supabase: ReturnType<typeof createBrowserClient>,
  uid: string
): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('assigned_sections')
    .eq('user_id', uid)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const raw = Array.isArray(data.assigned_sections) ? data.assigned_sections : []
  const assigned_sections = raw.map((s) => String(s).toLowerCase())
  return { user_id: uid, assigned_sections }
}
