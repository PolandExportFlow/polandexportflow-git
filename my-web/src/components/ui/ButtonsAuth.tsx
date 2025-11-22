'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import {
  LogIn,
  LogOut,
  PackagePlus,
  PackageSearch,
  MessageSquareText,
  Settings as SettingsIcon,
  ChevronDown,
  Loader2,
  Monitor,
} from 'lucide-react'

type ButtonProps = { onClick?: () => void }

const ButtonsAuth = {
  UserAuth: ({ onClick }: ButtonProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const supabase = useMemo(
      () =>
        createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ),
      []
    )

    useEffect(() => {
      const init = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setLoading(false)
      }
      init()

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    }, [supabase.auth])

    const handleSignOut = async (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation()
      try {
        await supabase.auth.signOut()
        router.push('/')
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }

    // 🌀 Ładowanie
    if (loading) {
      return (
        <div className="flex items-center justify-center w-64 h-[60px] rounded-md bg-light-blue shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-middle-blue/70" />
        </div>
      )
    }

    if (!user) {
      return (
        <button
          className="flex items-center justify-center gap-3 w-64 px-6 py-5 bg-red rounded-md text-white text-[16px] font-made_light shadow-md tracking-wide
          transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            ;(onClick || (() => router.push('/login')))()
          }}
        >
          Log in
          <LogIn className="w-5 h-5" />
        </button>
      )
    }

    // ✅ Zalogowany – dropdown
    return (
      <div className="relative group">
        <button
          className="flex items-center justify-center lg:justify-between gap-2 w-64 px-6 py-5 bg-red text-white text-[16px] font-made_light tracking-wide
          rounded-md group-hover:rounded-b-none group-hover:shadow-none group-hover:bg-middle-blue transition-all duration-300 z-10 relative"
          onClick={(e) => {
            e.stopPropagation()
            router.push('/dashboard')
          }}
          aria-haspopup="menu"
          aria-expanded="false"
        >
          Profile
          <ChevronDown className="w-6 h-6 hidden lg:block transition-transform duration-200 group-hover:rotate-180" />
        </button>

        {/* Dropdown */}
        <div
          className="
            absolute left-0 top-full w-64 bg-white rounded-b-md shadow-lg 
            border border-light-blue/70 border-t-0 z-50
            opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform 
            translate-y-[-2px] group-hover:translate-y-0 hidden lg:block
          "
          role="menu"
          aria-label="Profile menu"
        >
          <div className="divide-y divide-light-blue/70">
            {/* New Order */}
            <button
              type="button"
              onClick={() => router.push('/new-request')}
              className="
                w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
                bg-[#E9F9F1] text-[#0E4F3A] hover:bg-[#E3F6EB]
                relative
              "
            >
              <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-green rounded-bl-md" />
              <PackagePlus className="w-5 h-5 text-current" />
              <span>New Order</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
              text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue"
            >
              <Monitor className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/orders/')}
              className="w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
              text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue"
            >
              <PackageSearch className="w-5 h-5" />
              <span>Order History</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard#messages')}
              className="w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
              text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue"
            >
              <MessageSquareText className="w-5 h-5" />
              <span>Messages</span>
            </button>

            {/* Settings – ostatni z listy, bez dolnej linii */}
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
              text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue"
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Pusta przerwa jak jeden wiersz */}
          <div className="h-5" />

          {/* Stopka */}
          <div className="px-5 py-3">
            <span className="block text-[12px] text-middle-blue/40">
              Signed in as
            </span>
            <span className="block text-[13px] text-middle-blue/60 font-medium truncate">
              {user?.email || 'unknown'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4.5 text-left text-[14px] md:text-[15px] transition-colors
            text-middle-blue opacity-60 hover:opacity-100 hover:bg-light-blue/60"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    )
  },
}

export default ButtonsAuth
