'use client'
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Icons from '../common/Icons'
import ToCopy from '../common/ToCopy'
import { Mail } from 'lucide-react'

const MOBILE_H = 40 // px (było ~32)
const DESKTOP_H = 50

export const TOPBAR_MOBILE_H = MOBILE_H
export const TOPBAR_DESKTOP_H = DESKTOP_H

export default function TopBar() {
  const pathname = usePathname()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Mobile: pokazuj tylko na stronie głównej
  const hideOnMobile = !isDesktop && pathname !== '/'

  if (hideOnMobile) return null

  return (
    <div
      className="
        w-full bg-dark-blue text-light-blue
        flex items-center
        /* MOBILE (tylko tekst, nie fixed) */
        h-10 text-[12px] justify-center px-3
        /* DESKTOP (fixed + kontakty) */
        lg:h-[50px] lg:text-[13px] lg:justify-between lg:px-8 lg:tracking-wide
        lg:fixed lg:top-0 lg:left-0 lg:right-0 lg:z-40
      "
      style={{ height: isDesktop ? DESKTOP_H : MOBILE_H }}
    >
      {/* Tekst – zawsze widoczny */}
      <div className="font-made_medium_regular text-white truncate">
        <span>Welcome! We are open and shipping daily from Poland.</span>
      </div>

      {/* Kontakty – tylko desktop */}
      <div className="hidden lg:flex items-center gap-6 font-made_medium_regular">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <ToCopy text="contact@polandexportflow.com" label="contact@polandexportflow.com" />
        </div>
        <a
          href="https://wa.me/48784317005"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-75 transition-opacity"
        >
          <Icons.whatsappIcon className="w-4 h-4" />
          <span>+48 784 317 005</span>
        </a>
      </div>
    </div>
  )
}
