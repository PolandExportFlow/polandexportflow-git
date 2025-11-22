'use client'

import React from 'react'
import { cn } from '../../utils/cn'

type Props = {
	label?: React.ReactNode
	icon?: React.ReactNode
	className?: string
	spaced?: boolean
	dotted?: boolean
}

export default function UniversalSectionDivider({ label, icon, className, spaced = true, dotted = false }: Props) {
	const line = dotted ? 'border-dashed' : 'border-solid'

	return (
		<div
			className={cn(spaced ? 'my-8' : 'my-2', 'select-none', className)}
			aria-hidden='true'
			role='separator'
			tabIndex={-1}
			contentEditable={false}>
			{label ? (
				<div className='relative flex items-center pointer-events-none'>
					<div className={cn('flex-1 border-t', line, 'border-middle-blue/15')} />
					<span className='mx-3 px-3 py-1 rounded-full bg-middle-blue/5 text-middle-blue/60 text-[10px] font-made_regular border border-middle-blue/10 inline-flex items-center gap-2'>
						{icon ? <span className='pointer-events-none'>{icon}</span> : null}
						<span className='pointer-events-none'>{label}</span>
					</span>
					<div className={cn('flex-1 border-t', line, 'border-middle-blue/15')} />
				</div>
			) : (
				<div className={cn('w-full border-t', line, 'border-middle-blue/15', 'pointer-events-none')} />
			)}
		</div>
	)
}
