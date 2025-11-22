'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	Tag,
	Link as LinkIcon,
	ExternalLink,
	Plus,
	X,
	ListOrdered,
	Scale,
	Ruler,
	Banknote,
	FileText,
	Hash,
	Trash2,
	Loader2,
	UploadCloud,
} from 'lucide-react'
import clsx from 'clsx'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import UniversalDropdownModal from '@/components/ui/UniversalDropdownModal'
// ⭐️ IMPORTUJEMY TYP 'OrderItemStatus'
import { getOrderItemStatusConfig, ORDER_ITEM_STATUSES, type OrderItemStatus } from '@/utils/orderItemStatus'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import { createSignedUrl } from '@/utils/supabase/files'
import { EditableBox } from './ItemsPanel.shared'
import type { OrderItem, ItemImage } from '../../AdminOrderTypes'

type ItemPatch = Partial<OrderItem>

type Props = {
	item: OrderItem | null | undefined
	alt?: boolean
	onUpdateItem?: (itemId: string, patch: ItemPatch) => void | Promise<void>
	onAddImages?: (itemId: string, files: FileList) => void
	onRemoveImage?: (itemId: string | number, imageId: string | number, item: OrderItem) => void
	onThumbClick?: (itemId: string, image: ItemImage) => void
	onDeleteItem?: (itemId: string) => Promise<void> | void
	openPicker?: (id: string) => void
	fileInputRefCb?: (id: string, node: HTMLInputElement | null) => void
	onDrop?: (id: string, e: React.DragEvent<HTMLDivElement>) => void
}

const compact = <T extends Record<string, any>>(obj: T): Partial<T> =>
	Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
const isStoragePath = (raw: string) => !!raw && !/^(https?:|blob:|data:)/i.test(raw)

const ItemsRow: React.FC<Props> = props => {
	const {
		item: i,
		alt = false,
		onUpdateItem,
		onAddImages,
		onRemoveImage,
		onThumbClick,
		onDeleteItem,
		openPicker,
		fileInputRefCb,
		onDrop,
	} = props
	if (!i) return null

	const qty = Number.isFinite(Number(i.item_quantity)) ? Math.max(1, Math.round(Number(i.item_quantity))) : 1
	const unitValue = Number(i.item_value || 0)
	const link = i.item_url || ''
	const weight = typeof i.item_weight === 'number' && Number.isFinite(i.item_weight) ? i.item_weight : null

	const dims = {
		item_width: Number(i.dimensions?.item_width || 0),
		item_height: Number(i.dimensions?.item_height || 0),
		item_length: Number(i.dimensions?.item_length || 0),
	}

	const displayCode = i.item_number || (i.id ? `PEF-${String(i.id).slice(0, 6)}-${String(i.id).slice(6, 9)}` : '—')
	const rowBgClass = alt ? 'bg-[#F5F7FB]' : 'bg-light-blue'
	const images: ItemImage[] = Array.isArray(i.item_images) ? i.item_images : []

	const [isRowDragOver, setIsRowDragOver] = useState(false)
	const dragDepthRef = useRef(0)
	const allowDrop: React.DragEventHandler<HTMLDivElement> = e => {
		if (e.dataTransfer?.types?.includes('Files')) {
			e.preventDefault()
			e.stopPropagation()
			e.dataTransfer.dropEffect = 'copy'
		}
	}
	const onRowDragEnter: React.DragEventHandler<HTMLDivElement> = e => {
		if (!e.dataTransfer?.types?.includes('Files')) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current += 1
		setIsRowDragOver(true)
	}
	const onRowDragLeave: React.DragEventHandler<HTMLDivElement> = e => {
		if (!e.dataTransfer?.types?.includes('Files')) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
		if (dragDepthRef.current === 0) setIsRowDragOver(false)
	}
	const onRowDrop: React.DragEventHandler<HTMLDivElement> = e => {
		if (!e.dataTransfer?.files?.length) {
			setIsRowDragOver(false)
			dragDepthRef.current = 0
			return
		}
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current = 0
		setIsRowDragOver(false)
		if (onDrop) onDrop(String(i.id), e)
	}
	const imagesKey = useMemo(
		() => images.map((im, idx) => `${im?.id ?? idx}|${im.storage_path || im.file_url || ''}`).join('~'),
		[images]
	)
	const [signedMap, setSignedMap] = useState<Record<string, string>>({})
	useEffect(() => {
		let cancel = false
		;(async () => {
			if (!images.length) {
				if (Object.keys(signedMap).length) setSignedMap({})
				return
			}
			const pairs = await Promise.all(
				images.map(async (img, idx) => {
					const key = String(img?.id ?? idx)
					const rawStorage = img.storage_path || ''
					const rawDirect = img.file_url || ''
					if (rawDirect && !isStoragePath(rawDirect)) return [key, rawDirect] as const
					if (rawStorage && isStoragePath(rawStorage)) {
						try {
							return [key, await createSignedUrl(rawStorage, 900)] as const
						} catch {
							return [key, ''] as const
						}
					}
					return [key, ''] as const
				})
			)
			if (!cancel) {
				const m: Record<string, string> = {}
				for (const [k, v] of pairs) m[k] = v
				setSignedMap(m)
			}
		})()
		return () => {
			cancel = true
		}
	}, [imagesKey, images])
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [confirmImgId, setConfirmImgId] = useState<string | number | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)

	const [localStatus, setLocalStatus] = useState(String(i.item_status ?? 'none'))
	useEffect(() => {
		setLocalStatus(String(i.item_status ?? 'none'))
	}, [i.item_status])

	const StatusEl = (
		<div className='w-full sm:w-auto'>
			<div className='w-full [&>*]:w-full'>
				<UniversalDropdownModal
					selected={localStatus}
					button={<UniversalStatusBadge status={localStatus} getConfig={getOrderItemStatusConfig} />}
					options={ORDER_ITEM_STATUSES.map(s => ({
						value: s,
						content: <UniversalStatusBadge status={s} getConfig={getOrderItemStatusConfig} />,
					}))}
					onSelect={async next => {
						// ⭐️ POPRAWKA: Rzutujemy 'next' na poprawny typ 'OrderItemStatus'
						const nextStatus = String(next) as OrderItemStatus
						setLocalStatus(nextStatus) // Optymistyczna aktualizacja
						try {
							await onUpdateItem?.(String(i.id), { item_status: nextStatus })
						} catch (e) {
							setLocalStatus(String(i.item_status ?? 'none')) // Rollback
							console.error('Failed to update item status', e)
						}
					}}
					menuClassName='min-w-[180px]'
				/>
			</div>
		</div>
	)

	return (
		<div
			data-alt={alt ? 'true' : 'false'}
			className={clsx(
				'group/row relative p-3 md:p-4 flex flex-col gap-2 rounded-lg border border-middle-blue/16 transition-colors duration-150',
				rowBgClass,
				isRowDragOver && 'border-2 border-dashed border-green/70 bg-green/5'
			)}
			onDragEnter={onRowDragEnter}
			onDragOver={allowDrop}
			onDragLeave={onRowDragLeave}
			onDrop={onRowDrop}>
			{isRowDragOver && (
				<div className='pointer-events-none absolute inset-0 z-40 grid place-items-center rounded-lg border-2 border-dashed border-green/70 bg-green/10'>
					{' '}
					<div className='flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 border border-middle-blue/20'>
						{' '}
						<UploadCloud className='h-4 w-4' />{' '}
						<span className='text-[13px] md:text-[14px] text-middle-blue/90'>Drop images to add to this item</span>{' '}
					</div>{' '}
				</div>
			)}
			<div className='px-2'>
				<div className='flex items-center justify-between gap-2'>
					<div className='flex items-center gap-2 text-[15px] text-middle-blue font-heebo_medium min-w-0'>
						{' '}
						<Hash className='h-4.5 w-4.5 opacity-70' />{' '}
						<span className='truncate'>
							{' '}
							Item ID <b className='text-middle-blue/90'>{displayCode}</b>{' '}
						</span>{' '}
					</div>
					<div className='hidden sm:flex items-center gap-2 shrink-0'>
						{' '}
						{StatusEl}{' '}
						<button
							type='button'
							onClick={() => setConfirmOpen(true)}
							className='p-2 sm:p-3 rounded-lg text-middle-blue opacity-60 hover:opacity-100 hover:bg-middle-blue/10 focus-visible:ring-2 focus-visible:ring-middle-blue/30 transition'
							title='Delete item'
							aria-label='Delete item'>
							{' '}
							<Trash2 className='w-4 h-4 sm:w-5 sm:h-5' />{' '}
						</button>{' '}
					</div>
					<button
						type='button'
						onClick={() => setConfirmOpen(true)}
						className='sm:hidden p-2 rounded-lg text-middle-blue opacity-80 hover:opacity-100 hover:bg-middle-blue/10 focus-visible:ring-2 focus-visible:ring-middle-blue/30 transition shrink-0'
						title='Delete item'
						aria-label='Delete item'>
						{' '}
						<Trash2 className='w-4 h-4' />{' '}
					</button>
				</div>
				<div className='mt-2 sm:hidden'>{StatusEl}</div>
				<div className='mt-2 h-px bg-middle-blue/10' />
			</div>

			{/* ROW 1 – Name | Link | Price */}
			<div className='grid grid-cols-1 gap-2 md:grid md:grid-cols-12'>
				<div className='min-w-0 md:col-span-6 text-[15px] md:text-[16px]'>
					<EditableBox
						icon={<Tag className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Name'
						value={i.item_name ?? ''}
						placeholder='Name…'
						onCommit={v => onUpdateItem?.(String(i.id), compact({ item_name: String(v ?? '') }))}
						className='w-full'
					/>
				</div>
				<div className='min-w-0 md:col-span-4'>
					<EditableBox
						icon={<LinkIcon className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Link'
						value={link}
						placeholder='https://…'
						onCommit={v => onUpdateItem?.(String(i.id), compact({ item_url: String(v || '').trim() }))}
						after={
							link ? (
								<a
									href={/^https?:\/\//i.test(link) ? link : `https://${link}`}
									target='_blank'
									rel='noreferrer'
									className='opacity-70 transition-opacity duration-200 whitespace-nowrap shrink-0'
									title='Open link'
									onClick={e => e.stopPropagation()}>
									{' '}
									<ExternalLink className='h-3.5 w-3.5' />{' '}
								</a>
							) : null
						}
						className='w-full'
					/>
				</div>
				<div className='min-w-0 md:col-span-2 text-[13px]'>
					<EditableBox
						icon={<Banknote className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Price'
						value={Number.isFinite(unitValue) ? String(unitValue) : ''}
						mode='number'
						placeholder='0.00'
						suffix='PLN'
						onCommit={v =>
							onUpdateItem?.(String(i.id), compact({ item_value: (v ? Number(String(v).replace(',', '.')) : 0) || 0 }))
						}
						className='w-full px-3'
					/>
				</div>
			</div>

			{/* ROW 2 – Description */}
			<div className='grid grid-cols-1'>
				<EditableBox
					icon={<FileText className='h-3.5 w-3.5 text-middle-blue/70' />}
					label='Description'
					value={i.item_note ?? ''}
					placeholder='Short description…'
					mode='textarea'
					onCommit={v => onUpdateItem?.(String(i.id), compact({ item_note: String(v ?? '').trim() }))}
					className='w-full'
				/>
			</div>

			{/* ROW 3 – Qty | Weight | Dims | Photos */}
			<div className='grid grid-cols-1 md:grid md:grid-cols-12 gap-2'>
				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<ListOrdered className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Quantity'
						value={String(qty)}
						mode='number'
						placeholder='1'
						onCommit={v => {
							const n = Number(v)
							onUpdateItem?.(
								String(i.id),
								compact({ item_quantity: Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1 })
							)
						}}
						className='w-full'
					/>
				</div>
				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<Scale className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Weight'
						value={typeof weight === 'number' && Number.isFinite(weight) ? String(weight) : ''}
						placeholder='0'
						mode='number'
						suffix='kg'
						onCommit={v =>
							onUpdateItem?.(String(i.id), compact({ item_weight: v ? Number(String(v).replace(',', '.')) : 0 }))
						}
						className='w-full'
					/>
				</div>

				<div className='md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2'>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Width'
						value={dims.item_width ? String(dims.item_width) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v =>
							onUpdateItem?.(String(i.id), {
								dimensions: {
									...dims,
									item_width: v ? Number(String(v).replace(',', '.')) : 0,
								},
							})
						}
						className='w-full'
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Height'
						value={dims.item_height ? String(dims.item_height) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v =>
							onUpdateItem?.(String(i.id), {
								dimensions: {
									...dims,
									item_height: v ? Number(String(v).replace(',', '.')) : 0,
								},
							})
						}
						className='w-full'
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Length'
						value={dims.item_length ? String(dims.item_length) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v =>
							onUpdateItem?.(String(i.id), {
								dimensions: {
									...dims,
									item_length: v ? Number(String(v).replace(',', '.')) : 0,
								},
							})
						}
						className='w-full'
					/>
				</div>

				<div className='md:col-span-2 min-w-0 flex items-center'>
					<div
						role='button'
						tabIndex={0}
						onClick={() => openPicker?.(String(i.id))}
						className='inline-flex w-full h-12 items-center justify-between gap-2 rounded-md px-3 py-2 border transition-colors duration-200 cursor-pointer border-middle-blue/10 bg-ds-light-blue hover:bg-middle-blue/6'
						title='Add Photos'>
						<div className='flex items-center gap-2 min-w-0'>
							{' '}
							<Plus className='h-3.5 w-3.5' />{' '}
							<span className='text-[13px] text-middle-blue/80 whitespace-nowrap'>Add Photos</span>{' '}
						</div>{' '}
						<div />
					</div>
					<input
						type='file'
						accept='image/*'
						multiple
						className='hidden'
						ref={node => fileInputRefCb?.(String(i.id), node)}
						onChange={e => {
							if (e.currentTarget.files?.length && onAddImages) {
								onAddImages(String(i.id), e.currentTarget.files)
								e.currentTarget.value = ''
							}
						}}
					/>
				</div>
			</div>

			{/* thumbs */}
			{images.length > 0 && (
				<div className='mt-3'>
					<div className='flex flex-wrap gap-2 overflow-visible'>
						{images.map((img, idx) => {
							const key = String(img?.id ?? idx)
							const rawDirect = img.file_url || ''
							const rawStorage = img.storage_path || ''
							const src = rawDirect && !isStoragePath(rawDirect) ? rawDirect : signedMap[key] || ''
							const title = img?.file_name || `image-${idx + 1}`
							const loading = String(img?.id).startsWith('temp-') || (img as any)?.mime_type === 'pef/loading'
							return (
								<div
									key={key}
									className='group/thumb relative h-14 w-14 rounded-md border border-middle-blue/15 bg-white overflow-visible'
									title={title}>
									<button
										type='button'
										className='block h-full w-full text-left rounded-md overflow-hidden cursor-zoom-in'
										onClick={() => {
											const clickUrl = src || rawDirect
											if (clickUrl && !loading) setPreviewUrl(clickUrl)
											if (onThumbClick) onThumbClick(String(i.id), { ...img, file_url: clickUrl } as ItemImage)
										}}
										title='Click to preview'
										disabled={loading}>
										{src || rawDirect ? (
											<img
												src={src || rawDirect}
												alt=''
												className={`h-full w-full object-cover transition ${
													loading ? 'opacity-70' : 'group-hover/thumb:brightness-60'
												}`}
											/>
										) : (
											<div className='h-full w-full grid place-items-center text-[11px] text-middle-blue/60'>…</div>
										)}
									</button>
									{loading && (
										<div className='absolute inset-0 bg-white/60 backdrop-blur-[1px] grid place-items-center'>
											{' '}
											<Loader2 className='h-4 w-4 animate-spin text-middle-blue' />{' '}
										</div>
									)}
									{onRemoveImage ? (
										<button
											type='button'
											title={loading ? 'Uploading…' : 'Remove'}
											onClick={e => {
												e.preventDefault()
												e.stopPropagation()
												if (!loading) setConfirmImgId(img?.id ?? idx)
											}}
											disabled={loading}
											className={clsx(
												'absolute top-0 right-0 translate-x-1/3 -translate-y-1/3',
												'z-20 inline-flex items-center justify-center h-6 w-6 rounded-full text-white shadow-lg',
												'bg-middle-blue hover:bg-red transition-colors duration-150',
												'opacity-100 md:opacity-0 md:group-hover/thumb:opacity-100'
											)}>
											<X className='h-3.5 w-3.5' />
										</button>
									) : null}
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* modals */}
			<UniversalConfirmModal
				open={confirmOpen}
				title='Delete item?'
				description='This action cannot be undone. Are you sure you want to remove this item?'
				confirmText='Delete'
				cancelText='Cancel'
				tone='danger'
				size='md'
				onConfirm={async () => {
					await onDeleteItem?.(String(i.id))
					setConfirmOpen(false)
				}}
				onCancel={() => setConfirmOpen(false)}
			/>
			<UniversalConfirmModal
				open={confirmImgId !== null}
				title='Remove image?'
				description='Do you really want to remove this image?'
				confirmText='Remove'
				cancelText='Cancel'
				tone='danger'
				size='sm'
				onConfirm={() => {
					if (confirmImgId != null && i) onRemoveImage?.(String(i.id), confirmImgId, i)
					setConfirmImgId(null)
				}}
				onCancel={() => setConfirmImgId(null)}
			/>

			<UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
		</div>
	)
}

export default ItemsRow
