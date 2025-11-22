'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Hash, FileText, User, Mail, BadgeCheck, Package, Truck, CalendarClock, ShoppingCart } from 'lucide-react' // Dodano ShoppingCart
import { getStatusConfig, UI_STATUSES, type OrderStatus } from '@/utils/orderStatus'
import UniversalDropdownModal from '@/components/ui/UniversalDropdownModal'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import { Attachment, StatusBlock } from '../../AdminOrderTypes'
import AdditionalInfo from './AdditionalInfo'
import Attachments from './Attachments'

type Props = {
	overview: StatusBlock
	attachments: Attachment[]
	onChangeStatus?: (status: OrderStatus | string) => Promise<void> | void
	onChangeSource?: (orderType: string) => Promise<void> | void
	onAddFiles?: (files: File[]) => Promise<void> | void
	onDeleteAttachment?: (file: Attachment) => Promise<void> | void
	onRefresh?: () => Promise<void> | void
	orderNote?: string
	onSaveOrderNote?: (note: string) => Promise<void> | void
}

/* helpers */
const fmtPL = (d?: string | Date | null) =>
	d
		? new Intl.DateTimeFormat('pl-PL', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
		  }).format(new Date(d))
		: '—'

export default function StatusPanel({
	overview,
	attachments,
	onChangeStatus,
	onChangeSource,
	onAddFiles,
	onDeleteAttachment,
	onRefresh,
	orderNote = '',
	onSaveOrderNote,
}: Props) {
	const [localStatus, setLocalStatus] = useState<string>(overview.order_status)
	useEffect(() => setLocalStatus(overview.order_status), [overview.order_status])

	// ZMIANA 1: Używamy 'Assisted Purchase' jako domyślnej, jeśli order_type jest null
	const initialOrderType = overview.order_type || 'Assisted Purchase'
	const [localOrderType, setLocalOrderType] = useState<string>(initialOrderType)
	useEffect(() => {
		const next = overview.order_type || 'Assisted Purchase' // ZMIANA 2: Domyślna wartość
		setLocalOrderType(next)
	}, [overview.order_type])

	const getOrderCfg = (s: unknown) => getStatusConfig(String(s || 'created') as OrderStatus)

	// ZMIANA 3: Zmieniono 'Personal Shipping' na 'Assisted Purchase'
	const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
		'Parcel Forwarding': Package,
		'Assisted Purchase': ShoppingCart, // Zmieniono z Truck na ShoppingCart (lub inna ikona, jeśli wolisz)
	}

	// ZMIANA 4: Zaktualizowano listę opcji w useMemo
	const sourceOptions = useMemo(
		() =>
			(['Parcel Forwarding', 'Assisted Purchase'] as const).map(s => {
				const IconComp = serviceIcons[s] || Package
				return {
					value: s,
					content: (
						<span className='inline-flex items-center gap-2 text-[13px]'>
							<IconComp className='w-4 h-4 opacity-70' />
							{s}
						</span>
					),
				}
			}),
		[]
	)

	const SelectedServiceBadge = () => {
		const IconComp = serviceIcons[localOrderType as keyof typeof serviceIcons] || Package
		return (
			<span className='inline-flex items-center gap-2 rounded-full px-3.5 py-[6px] text-[13px] leading-none align-middle bg-light-blue text-middle-blue border border-middle-blue/30'>
				<IconComp className='w-4 h-4 opacity-70' />
				{localOrderType}
			</span>
		)
	}

	return (
		<UniversalDetail
			title='Przegląd zamówienia'
			icon={<FileText className='h-5 w-5' />}
			className='bg-white border-light-blue h-full'>
			<div className='space-y-0'>
				<DetailRow
					icon={<Hash className='w-3.5 h-3.5' />}
					label='Numer'
					value={<span className='select-text'>{overview.order_number || '—'}</span>}
					valueText={overview.order_number || ''}
					actions={[{ kind: 'copy', label: 'Kopiuj numer' }]}
				/>

				<DetailRow
					icon={<User className='w-3.5 h-3.5' />}
					label='Użytkownik'
					value={<span className='select-text'>{overview.user_full_name?.trim() || '—'}</span>}
					valueText={overview.user_full_name?.trim() || ''}
					actions={[{ kind: 'copy', label: 'Kopiuj nazwę' }]}
				/>

				<DetailRow
					icon={<Mail className='w-3.5 h-3.5' />}
					label='E-mail'
					value={<span className='select-text'>{overview.user_email?.trim() || '—'}</span>}
					valueText={overview.user_email?.trim() || ''}
					actions={[{ kind: 'copy', label: 'Kopiuj e-mail' }]}
				/>

				{/* Status zamówienia */}
				<DetailRow
					flushRight
					icon={<BadgeCheck className='w-3.5 h-3.5' />}
					label='Status'
					value={
						<UniversalDropdownModal
							className='ml-[-4px]'
							selected={localStatus}
							button={<UniversalStatusBadge status={localStatus} getConfig={getOrderCfg} />}
							options={UI_STATUSES.map(s => ({
								value: s,
								content: <UniversalStatusBadge status={s} getConfig={getOrderCfg} />,
							}))}
							onSelect={async next => {
								try {
									setLocalStatus(next)
									await onChangeStatus?.(next)
								} catch (e) {
									setLocalStatus(overview.order_status)
									console.error('[OverviewPanel] onChangeStatus error:', e)
								}
							}}
							menuClassName='min-w-[240px] [&_button]:h-[44px]'
						/>
					}
				/>

				<DetailRow
					flushRight
					icon={<Package className='w-3.5 h-3.5' />}
					label='Usługa'
					value={
						<UniversalDropdownModal
							className='ml-[-4px]'
							selected={localOrderType}
							button={<SelectedServiceBadge />}
							options={sourceOptions}
							onSelect={async next => {
								try {
									setLocalOrderType(next)
									await onChangeSource?.(next)
								} catch (e) {
									setLocalOrderType(initialOrderType)
									console.error('[OverviewPanel] onChangeSource error:', e)
								}
							}}
							menuClassName='min-w-[240px]'
						/>
					}
				/>
				<DetailRow
					icon={<CalendarClock className='w-3.5 h-3.5' />}
					label='Utworzone'
					value={<span className='select-text'>{fmtPL(overview.created_at)}</span>}
				/>
			</div>

			<AdditionalInfo initialNote={orderNote} onSave={onSaveOrderNote} onRefresh={onRefresh} />
			<hr className='my-6 border-light-blue/50' />
			<Attachments
				attachments={attachments}
				onAddFiles={onAddFiles}
				onDeleteAttachment={onDeleteAttachment}
				onRefresh={onRefresh}
			/>
		</UniversalDetail>
	)
}
