'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Lottie tylko dla CTA
const LottiePlayer = dynamic(() => import('../Lottie/LottiePlayer'), { ssr: false })

// Animacje
import greenBoxAnimation from '../../../public/icons/btnPackageGreenPEF.json'
import sendAnimation from '../../../public/icons/btnSendPEF.json'

type ButtonProps = { onClick?: () => void }

const Buttons = {
  /** CTA: kopia SignUp – zostawiam dla kompatybilności */
  GetYourQuote: ({ onClick }: ButtonProps) => {
    const router = useRouter()
    return (
      <button
        className="flex items-center justify-center gap-3 md:gap-4 px-8 md:px-12 py-3 md:py-4 bg-[#22C55E] rounded-md text-white text-[14px] md:text-[16px] font-made_light shadow-md tracking-wide
        hover:bg-[#22C55E] transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out] hover:scale-105"
        onClick={onClick || (() => router.push('/#contact'))}
      >
        Start Shipping
        <div className="w-8 md:w-10 h-8 md:h-10">
          <LottiePlayer animationData={greenBoxAnimation} interval={3000} />
        </div>
      </button>
    )
  },

  /** CTA: link do strony „How it works?” */
  HowItWorks: ({ onClick }: ButtonProps) => {
    const router = useRouter()
    return (
      <button
        className="flex items-center justify-center px-8 py-3 rounded-md text-white text-[14px] font-made_light bg-middle-blue/8 shadow-md border-2 border-white tracking-wide transition-all duration-300 opacity-60 hover:opacity-100 hover:animate-[exportWave_0.4s_ease-in-out]"
        onClick={onClick || (() => router.push('/how-it-works'))}
      >
        How it works?
      </button>
    )
  },

  /** CTA: wysłanie wiadomości */
  ContactBtn: ({ onClick }: ButtonProps) => {
    return (
      <button
        className="flex items-center justify-center gap-3 px-7 py-3 h-[60px] w-full md:w-auto bg-red rounded-md text-white text-[14px] font-made_light shadow-md tracking-wide
        hover:bg-red transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out]"
        onClick={onClick}
      >
        Send a Message
        <div className="w-8 h-8">
          <LottiePlayer animationData={sendAnimation} interval={4000} />
        </div>
      </button>
    )
  },
}

export default Buttons
