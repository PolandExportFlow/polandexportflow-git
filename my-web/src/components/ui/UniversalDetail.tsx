'use client'

import React, { useEffect, useId, useState, KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export const UniversalDetail: React.FC<{
	title?: string | React.ReactNode
	icon?: React.ReactNode
	headerExtra?: React.ReactNode
	headerExtraPosition?: 'right' | 'below'
	children?: React.ReactNode
	className?: string
	clickable?: boolean
	onClick?: () => void
	collapsible?: boolean
	defaultOpen?: boolean
	defaultOpenMobile?: boolean
	onToggle?: (open: boolean) => void
}> = ({
	title,
	icon,
	headerExtra,
	headerExtraPosition = 'right',
	children = null,
	className,
	clickable,
	onClick,
	collapsible = true,
	defaultOpen = true,
	defaultOpenMobile = true,
	onToggle,
}) => {
	const contentId = useId()
	const [open, setOpen] = useState(true)

	useEffect(() => {
		if (!collapsible) {
			setOpen(true)
			return
		}
		const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
		setOpen(isMobile ? defaultOpenMobile : defaultOpen)
	}, [collapsible, defaultOpen, defaultOpenMobile])

	const toggle = () => {
		if (!collapsible) return
		setOpen(prev => {
			const next = !prev
			onToggle?.(next)
			return next
		})
	}

	const onHeaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!collapsible) return
		const el = e.target as HTMLElement
		if (el.closest('[data-no-toggle="true"]')) return
		toggle()
	}

	const onHeaderKey = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!collapsible) return
		const el = e.target as HTMLElement
		if (el.closest('[data-no-toggle="true"]')) return
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			toggle()
		}
	}

	return (
		<section
			className={cn(
				'w-full rounded-lg border border-light-blue bg-white shadow-sm text-middle-blue',
				clickable && 'cursor-pointer',
				className
			)}
			onClick={clickable ? onClick : undefined}>
			{(title || icon || headerExtra || collapsible) && (
				<header className='w-full'>
					<div
						role={collapsible ? 'button' : undefined}
						tabIndex={collapsible ? 0 : -1}
						aria-expanded={collapsible ? open : undefined}
						aria-controls={collapsible ? contentId : undefined}
						onKeyDown={onHeaderKey}
						onClick={onHeaderClick}
						className={cn(
							'flex items-center gap-3 w-full',
							'p-4 md:p-6 min-h-[64px]',
							'select-none',
							collapsible && 'cursor-pointer hover:bg-light-blue/44 transition-colors',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue focus-visible:ring-offset-1',
							'rounded-t-lg'
						)}>
						<div className='flex min-w-0 items-center gap-3 md:gap-4 flex-1'>
							{icon && (
								<div className='w-10 h-10 shrink-0 rounded-md grid place-items-center bg-[#e9f3ff] pointer-events-none'>
									{icon}
								</div>
							)}
							{title && (
								<h4 className='truncate font-heebo_medium pointer-events-none text-[14px] md:text-[16px]'>{title}</h4>
							)}
						</div>

						{headerExtra && headerExtraPosition === 'right' && (
							<div className='flex items-center text-[13px] min-w-0'>{headerExtra}</div>
						)}

						{collapsible && (
							<ChevronDown
								className={cn(
									'h-[18px] w-[18px] shrink-0 transition-transform opacity-70 mr-2',
									open ? 'rotate-0' : '-rotate-90'
								)}
								aria-hidden
							/>
						)}
					</div>

					{headerExtra && headerExtraPosition === 'below' && (
						<div className='px-4 md:px-6 pb-4' data-no-toggle='true'>
							{headerExtra}
						</div>
					)}
				</header>
			)}

			<div
				id={contentId}
				aria-hidden={!open}
				className={cn('px-2.5 pb-4 md:px-6 md:pb-6', collapsible && (open ? 'block' : 'hidden'))}>
				{children}
			</div>
		</section>
	)
}
