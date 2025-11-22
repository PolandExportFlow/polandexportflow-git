'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
	title: React.ReactNode
	icon?: React.ReactNode
	children: React.ReactNode
	defaultOpen?: boolean
	whiteBg?: boolean
}

export default function UniversalDetailOption({ title, icon, children, defaultOpen = false, whiteBg = false }: Props) {
	const [open, setOpen] = useState(defaultOpen)
	const contentId = useId()
	const panelRef = useRef<HTMLDivElement>(null)
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [maxH, setMaxH] = useState<number>(open ? 99999 : 0)

	useEffect(() => {
		const el = panelRef.current
		if (!el) return () => {}

		const update = () => setMaxH(el.scrollHeight)
		let ro: ResizeObserver | null = null
		let scrollTimer: NodeJS.Timeout | undefined = undefined

		if (open) {
			update()
			if (typeof ResizeObserver !== 'undefined') {
				ro = new ResizeObserver(update)
				ro.observe(el)
			}

			// ⭐️ START POPRAWKI: Zmieniono 'end' na 'center'
			scrollTimer = setTimeout(() => {
				if (wrapperRef.current) {
					wrapperRef.current.scrollIntoView({
						behavior: 'smooth',
						block: 'center', // Przewija, aby element był na środku ekranu
					})
				}
			}, 210)
			// ⭐️ KONIEC POPRAWKI
		} else {
			setMaxH(0)
		}

		return () => {
			ro?.disconnect()
			if (scrollTimer) clearTimeout(scrollTimer)
		}
	}, [open, children])

	const headerBg = whiteBg ? 'bg-white hover:bg-white/60' : 'bg-light-blue hover:bg-middle-blue/12'
	const bodyBg = whiteBg ? 'bg-white' : 'bg-light-blue/40'

	return (
		<div className='mt-4' ref={wrapperRef}>
			{/* Header */}
			<button
				type='button'
				onClick={() => setOpen(s => !s)}
				className={`w-full p-5 px-6 flex items-center justify-between border border-middle-blue/15
${headerBg} text-left transition-colors
${open ? 'rounded-t-lg border-x border-t border-b-0' : 'rounded-lg border-b-2'}
`}
				aria-expanded={open}
				aria-controls={contentId}>
				<span className='inline-flex items-center gap-2 text-[15px] font-heebo_medium text-middle-blue'>
					{icon ? <span className='inline-flex items-center justify-center'>{icon}</span> : null}
					{title}
				</span>
				<ChevronDown className={`w-4 h-4 text-middle-blue transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
			</button>

			{/* Body */}
			<div
				id={contentId}
				aria-hidden={!open}
				className={`relative border-x border-b border-middle-blue/14 ${bodyBg} rounded-b-lg
transition-[max-height,opacity] duration-200 ease-in-out
${open ? 'opacity-100 overflow-visible' : 'opacity-0 overflow-hidden'}
`}
				style={{ maxHeight: maxH ? `${maxH}px` : '0px' }}>
				<div ref={panelRef} className='pt-3 px-4 pb-6'>
					{children}
				</div>
			</div>
		</div>
	)
}
