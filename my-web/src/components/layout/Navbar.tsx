// app/components/layout/Navbar/Navbar.tsx (GOTOWY I POPRAWIONY)
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Logo from '../common/Logo'
import Icons from '../common/Icons'
import { usePathname } from 'next/navigation'
import ButtonsAuth from '../ui/ButtonsAuth'
import NavbarMobileAccount from './NavbarMobileAccount'
import { TOPBAR_MOBILE_H, TOPBAR_DESKTOP_H } from './TopBar'

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [topOffset, setTopOffset] = useState(0)

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // LOGIKA BLOKUJĄCA SCROLLOWANIE
  useEffect(() => {
    const shouldBlockScroll = isOpen && !isDesktop
    
    if (shouldBlockScroll) {
      document.body.style.overflow = 'hidden'
      // Zapewniamy, że content w szufladzie może się przewijać (overflow-y-auto na wrapperze)
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isDesktop])

  useEffect(() => {
    const handle = () => {
      const y = window.scrollY
      const mobileBase = pathname === '/' ? TOPBAR_MOBILE_H : 0
      const base = isDesktop ? TOPBAR_DESKTOP_H : mobileBase
      setTopOffset(Math.max(0, base - y))
    }
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [isDesktop, pathname])

  const closeMenu = () => setIsOpen(false)

  const hideAccountUI =
    pathname?.startsWith('/auth/') || pathname === '/forgot-password' || pathname === '/login'

  const normalizedPathname =
    pathname && pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  return (
    <div
      id="navbar"
      className="
        fixed w-full h-20 border-b bg-white border-middle-blue
        flex items-center justify-between
        pl-6 lg:px-8
        z-50
      "
      style={{ top: `${topOffset}px` }}
    >
      <Logo />

      {/* Burger - mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden focus:outline-none p-6"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Icons.BurgerIcon className="w-7 h-7 text-middle-blue" />
      </button>

      {/* Drawer (mobile) / Normal (desktop) */}
      <div
        className={`
          fixed lg:static right-0
          ${isDesktop ? 'h-auto' : 'h-screen'}
          w-full lg:w-auto
          bg-white lg:bg-transparent
          border-l lg:border-none
          transition-transform duration-300 ease-in-out
          transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0
          z-[60]
          flex flex-col lg:flex-row items-stretch lg:items-center lg:justify-end
        `}
        style={{ top: isDesktop ? 0 : 0 }} /* Drawer przyklejony do góry viewportu */
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer header (mobile) */}
        <div className="w-full h-[80px] lg:hidden flex items-center justify-between pl-6 border-b border-middle-blue">
          <Logo />
          <button onClick={closeMenu} className="focus:outline-none p-6" aria-label="Close menu">
            <Icons.CloseIcon className="w-7 h-7 text-middle-blue" />
          </button>
        </div>

        {/* Wrapper */}
        <div className="h-full lg:h-auto flex flex-col lg:flex-row lg:items-center lg:justify-center overflow-y-auto lg:overflow-visible">
          {/* Linki główne: TYLKO DESKTOP */}
          <ul className="hidden lg:flex lg:mr-8">
            {[
              { id: 1, name: 'How it works?', path: '/how-it-works' },
              { id: 2, name: 'Pricing', path: '/pricing' },
              { id: 3, name: 'About Us', path: '/about-us' },
              { id: 4, name: 'Blog', path: '/blog' },
            ].map((item) => {
              const isActive = normalizedPathname === item.path
              return (
                <li className="li-nav inline-block" key={item.id}>
                  <Link
                    href={item.path}
                    className={`block hover:text-red transition duration-300 p-6 ${
                      isActive ? 'text-red' : 'text-middle-blue'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Account */}
          {!hideAccountUI && (
            <div className="w-full lg:w-auto lg:pl-4">
              <div className="hidden lg:block">
                <ButtonsAuth.UserAuth />
              </div>
              <div className="block lg:hidden">
                <NavbarMobileAccount onNavigate={closeMenu} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}