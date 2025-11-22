// app/(dashboard)/QuickActionsWidget/QuickActionsWidget.tsx
'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { HelpCircle, AlertTriangle, Globe, Users, Briefcase, Shirt } from 'lucide-react'

import DashboardButton from '../DashboardButton'

type Action = {
	Icon: LucideIcon
	title: string
	subtitle?: string
	/** Jeśli masz stronę – podaj href; jeśli nie, zostaw onClick */
	href?: string
	onClick?: () => void
	variant?: 'primary' | 'default'
}

const ACTIONS: Action[] = [
	{
		Icon: AlertTriangle,
		title: 'Prohibited Items',
		subtitle: 'List of forbidden products',
		href: '/prohibited-items',
	},
	{
		Icon: HelpCircle,
		title: 'Help & FAQ',
		subtitle: 'Frequently asked questions',
		href: '/help',
	},
	{
		Icon: Globe,
		title: 'Customs & Country Rules',
		subtitle: 'Documents, duties, restrictions',
		href: '/customs', 
	},
	{
		Icon: Briefcase,
		title: 'For Business Clients',
		subtitle: 'Solutions for importers and resellers',
		href: '/for-business',
	},
	{
		Icon: Shirt,
		title: 'For Vinted Sellers',
		subtitle: 'Shipping and storage solutions for online sellers',
		href: '/vinted-sellers',
	},
	{
		Icon: Users,
		title: 'Partner Program',
		subtitle: 'Join our referral network',
		href: '/partner-program',
	},
] as const

export default function QuickActionsWidget() {
	return (
		<div className='w-full max-w-full bg-light-blue rounded-md flex flex-col gap-2'>
			{ACTIONS.map(a => (
				<DashboardButton
					key={a.title}
					Icon={a.Icon}
					title={a.title}
					subtitle={a.subtitle}
					variant={a.variant ?? 'default'}
					{...(a.href ? { href: a.href } : { onClick: a.onClick ?? (() => {}) })}
				/>
			))}
		</div>
	)
}
