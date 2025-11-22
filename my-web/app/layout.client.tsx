'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { usePathname } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

// ✅ SIMPLE SESSION CONTEXT
const SessionContext = createContext<any>(null)

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // ✅ CHECK IF ADMIN PAGE
  const isAdminPage = pathname?.startsWith('/admin')

  // ✅ ADMIN: No navigation
  if (isAdminPage) {
    return (
      <SessionContext.Provider value={{ session, loading, supabase }}>
        {children}
      </SessionContext.Provider>
    )
  }

  // ✅ NORMAL: Full navigation
  return (
    <SessionContext.Provider value={{ session, loading, supabase }}>
      <TopBar />
      <Navbar />
      <main className='w-full flex-grow'>{children}</main>
      <Footer />
    </SessionContext.Provider>
  )
}