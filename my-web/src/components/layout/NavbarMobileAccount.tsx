'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import {
    PackagePlus,
    PackageSearch,
    MessageSquareText,
    DollarSign,
    BookOpenText,
    Settings as SettingsIcon,
    LogIn,
    UserPlus,
    LogOut,
    Handshake,
    FileBox,
    Monitor,
} from 'lucide-react'

type NavbarMobileAccountProps = {
    onNavigate?: () => void
}

export default function NavbarMobileAccount({ onNavigate }: NavbarMobileAccountProps) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        []
    )

    useEffect(() => {
        const init = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)
        }
        init()
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })
        return () => subscription.unsubscribe()
    }, [supabase.auth])

    const go = (href: string) => {
        onNavigate?.()

        if (href.includes('#')) {
            const [path, hash] = href.split('#')
            const targetPath = path || window.location.pathname

            router.push(targetPath)

            requestAnimationFrame(() => {
                if (hash) {
                    const el = document.getElementById(hash)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    else window.location.hash = hash
                }
            })
            return
        }

        router.push(href)
    }

    const logout = async () => {
        await supabase.auth.signOut()
        onNavigate?.()
        router.push('/')
    }

    if (loading) {
        return (
            <div className='px-6 py-4'>
                <div className='h-10 bg-light-blue animate-pulse rounded' />
            </div>
        )
    }

    const Item = ({
        icon,
        label,
        onClick,
        withTopBorder = true,
        variant = 'default',
        active = false,
    }: {
        icon: JSX.Element
        label: string
        onClick: () => void
        withTopBorder?: boolean
        variant?: 'default' | 'muted'
        active?: boolean
    }) => {
        const border = withTopBorder ? 'border-t border-light-blue/70' : ''
        const base = 'w-full flex items-center gap-3 px-6 py-4 text-left transition-colors text-[14px] md:text-[15px]'
        const variants = {
            default: 'text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue',
            muted: 'text-middle-blue opacity-60 hover:opacity-100 hover:bg-light-blue/60',
        } as const

        const activeStyle = active ? 'bg-[#E9F9F1] text-[#0E4F3A] border-l-4 border-green' : variants[variant]

        return (
            <button onClick={onClick} className={`${base} ${border} ${activeStyle}`}>
                <span className='w-5 h-5 inline-flex items-center justify-center'>{icon}</span>
                <span>{label}</span>
            </button>
        )
    }

    if (user) {
        return (
            <div className='w-full flex flex-col pb-[max(env(safe-area-inset-bottom),0px)] bg-white'>
                <div>
                    <Item
                        icon={<PackagePlus className='w-5 h-5' />}
                        label='New Order'
                        onClick={() => go('/new-request')}
                        withTopBorder={false}
                        active
                    />
                    <Item icon={<Monitor className='w-5 h-5' />} label='Dashboard' onClick={() => go('/dashboard')} />
                    <Item
                        icon={<PackageSearch className='w-5 h-5' />}
                        label='Order History'
                        onClick={() => go('/orders/')}
                    />
                    <Item
                        icon={<MessageSquareText className='w-5 h-5' />}
                        label='Messages'
                        onClick={() => go('/dashboard#messages')}
                    />
                    <Item icon={<FileBox className='w-5 h-5' />} label='How it works?' onClick={() => go('/how-it-works')} />
                    <Item icon={<DollarSign className='w-5 h-5' />} label='Pricing' onClick={() => go('/pricing')} />
                    <Item icon={<Handshake className='w-5 h-5' />} label='About Us' onClick={() => go('/about-us')} />
                    <Item icon={<BookOpenText className='w-5 h-5' />} label='Blog' onClick={() => go('/blog')} />
                    <Item icon={<SettingsIcon className='w-5 h-5' />} label='Settings' onClick={() => go('/settings')} />
                </div>

                <div className='mt-12 mb-4 border-t border-light-blue/70 flex items-center justify-between px-6 py-3'>
                    <button
                        onClick={logout}
                        className='flex items-center gap-2 text-middle-blue/60 hover:text-red transition-colors text-[14px]'>
                        <LogOut className='w-4 h-4' />
                        <span>Sign Out</span>
                    </button>
                    <div className='text-right'>
                        <span className='block text-[10px] md:text-[12px] text-middle-blue/50'>Signed in as</span>
                        <p className='text-[11px] md:text-[12px] text-middle-blue/70 mt-0.5 break-all'>{user.email}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='w-full flex flex-col pb-[max(env(safe-area-inset-bottom),0px)] bg-white'>
            <div>
                <Item icon={<LogIn className='w-5 h-5' />} label='Log in' onClick={() => go('/login')} withTopBorder={false} />
                <Item icon={<UserPlus className='w-5 h-5' />} label='Register' onClick={() => go('/register')} />
                <Item icon={<FileBox className='w-5 h-5' />} label='How it works?' onClick={() => go('/how-it-works')} />
                <Item icon={<DollarSign className='w-5 h-5' />} label='Pricing' onClick={() => go('/pricing')} />
                <Item icon={<Handshake className='w-5 h-5' />} label='About Us' onClick={() => go('/about-us')} />
                <Item icon={<BookOpenText className='w-5 h-5' />} label='Blog' onClick={() => go('/blog')} />
            </div>
        </div>
    )
}