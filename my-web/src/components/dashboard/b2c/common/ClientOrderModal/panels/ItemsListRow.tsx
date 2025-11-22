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
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import { getOrderItemStatusConfig } from '@/utils/orderItemStatus'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import {
	EditableBox,
	ActionBox,
	strNumber,
	parseLocalizedNumber,
	safeHttp,
	getQty,
	getUnitValuePLN,
	getWeightKg,
	normalizeDimsFromItem,
} from './ItemsList.shared'
import type { ItemsPanelRowDB as Item, ClientFile } from '../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'
import clsx from 'clsx'

type ItemPatch = Partial<Item>

type Props = {
	item: Item | undefined | null
	alt?: boolean
	onUpdateItem?: (itemId: string, patch: ItemPatch) => void
	onAddImages?: (itemId: string, files: FileList) => void
	onRemoveImage?: (itemId: string | number, imageId: string | number) => void | Promise<void>
	onThumbClick?: (itemId: string, image: ClientFile) => void
	onDeleteItem?: (itemId: string) => Promise<void> | void
}

const ItemsListRow: React.FC<Props> = ({
	item,
	alt = false,
	onUpdateItem,
	onAddImages,
	onRemoveImage,
	onThumbClick,
	onDeleteItem,
}) => {
	if (!item) return null
	const i = item

	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [expandedMobile, setExpandedMobile] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [confirmImgId, setConfirmImgId] = useState<string | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)

	const qty = getQty(i)
	const unitValue = getUnitValuePLN(i)
	const link = i.item_url ?? ''
	const weight = getWeightKg(i)
	const dims = normalizeDimsFromItem(i)
	const displayCode = i.item_number || i.id?.slice(0, 8) || '—'
	const rowBgClass = alt ? 'bg-[#F5F7FB]' : 'bg-ds-middle-blue'
	const currentDesc = i.item_note ?? ''

	const images = Array.isArray(i.files) ? i.files : []

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
		const files = Array.from(e.dataTransfer.files || [])
		dragDepthRef.current = 0
		setIsRowDragOver(false)
		if (files.length && onAddImages) {
			const dt = new DataTransfer()
			for (const f of files) dt.items.add(f)
			onAddImages(String(i.id), dt.files)
		}
	}

	const imagesKey = useMemo(
		() =>
			images
				.map(img => {
					const id = String((img as any)?.id ?? '')
					const path = (img as any)?.storage_path || ''
					return `${id}|${path}`
				})
				.join('~'),
		[images]
	)

	const [signedMap, setSignedMap] = useState<Record<string, string>>({})

	useEffect(() => {
		let cancelled = false
		async function ensureSigned() {
			if (!images.length) {
				if (Object.keys(signedMap).length) setSignedMap({})
				return
			}
			const pairs = await Promise.all(
				images.map(async (img, idx) => {
					const key = String((img as any)?.id ?? idx)
					const raw = (img as any)?.storage_path || ''
					const fileUrl = (img as any)?.file_url

					// 1. Blob (lokalny plik zaraz po dodaniu - Optymistic UI)
					if (fileUrl && String(fileUrl).startsWith('blob:')) return [key, fileUrl] as const

					// 2. Jeśli URL jest już HTTP
					if (/^https?:\/\//i.test(raw)) return [key, raw] as const

					// 3. Pobranie z R2 przez Edge Function (Atomic logic)
					if (raw && (img as any).id && !String((img as any).id).startsWith('temp-')) {
						try {
							const { data, error } = await supabase.functions.invoke('user_order_file_get_url', {
								// 🛑 POPRAWKA: file_id zamiast attachment_id
								body: { file_id: (img as any).id },
							})
							if (!error && data?.url) {
								return [key, data.url] as const
							}
						} catch {}
					}
					return [key, ''] as const
				})
			)
			if (cancelled) return
			const next: Record<string, string> = {}
			for (const [k, v] of pairs) next[k] = v
			setSignedMap(next)
		}
		void ensureSigned()
		return () => {
			cancelled = true
		}
	}, [imagesKey])

	const StatusEl = (
		<div className='w-full sm:w-auto'>
			<div className='w-full [&>*]:w-full'>
				<UniversalStatusBadge status={String(i.item_status ?? 'none')} getConfig={getOrderItemStatusConfig} />
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
				<div
					className='pointer-events-none absolute inset-0 z-40 grid place-items-center rounded-lg border-2 border-dashed border-green/70 bg-green/10'
					aria-hidden='true'>
					<div className='flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 border border-middle-blue/20'>
						<UploadCloud className='h-4 w-4' />
						<span className='text-[13px] md:text-[14px] text-middle-blue/90'>Drop images to add to this item</span>
					</div>
				</div>
			)}

			<div className='px-2'>
				<div className='flex items-center justify-between gap-2'>
					<div className='flex items-center gap-2 text-[15px] text-middle-blue font-heebo_medium min-w-0'>
						<Hash className='h-[18px] w-[18px] opacity-70' />
						<span className='truncate'>
							Item ID <b className='text-middle-blue/90'>{displayCode}</b>
						</span>
					</div>
					<div className='hidden sm:flex items-center gap-2 shrink-0'>
						{StatusEl}
						<button
							type='button'
							onClick={() => setConfirmOpen(true)}
							className='p-2 sm:p-3 rounded-lg text-middle-blue opacity-60 hover:opacity-100 hover:bg-middle-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/30 transition'
							title='Delete item'
							aria-label='Delete item'>
							<Trash2 className='w-4 h-4 sm:w-5 sm:h-5' />
						</button>
					</div>
					<button
						type='button'
						onClick={() => setConfirmOpen(true)}
						className='sm:hidden p-2 rounded-lg text-middle-blue opacity-80 hover:opacity-100 hover:bg-middle-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/30 transition shrink-0'
						title='Delete item'
						aria-label='Delete item'>
						<Trash2 className='w-4 h-4' />
					</button>
				</div>
				<div className='mt-2 sm:hidden'>{StatusEl}</div>
				<div className='mt-2 h-px bg-middle-blue/10' />
			</div>

			<div className='grid grid-cols-1 gap-2 md:grid md:grid-cols-12'>
				<div className='min-w-0 md:col-span-6 text-[15px] md:text-[16px]'>
					<EditableBox
						icon={<Tag className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Name'
						value={i.item_name ?? ''}
						placeholder='Name…'
						onCommit={v => onUpdateItem?.(String(i.id), { item_name: String(v ?? '') })}
						className='w-full'
					/>
				</div>

				<div className='min-w-0 md:col-span-4'>
					<EditableBox
						icon={<LinkIcon className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Link'
						value={link}
						placeholder='https://…'
						onCommit={v => onUpdateItem?.(String(i.id), { item_url: String(v || '').trim() })}
						after={
							link ? (
								<a
									href={safeHttp(link)}
									target='_blank'
									rel='noreferrer'
									className='opacity-70 transition-opacity duration-200 whitespace-nowrap shrink-0'
									title='Open link'>
									<ExternalLink className='h-3.5 w-3.5' />
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
						value={strNumber(unitValue)}
						mode='number'
						placeholder='0.00'
						suffix='PLN'
						onCommit={v => onUpdateItem?.(String(i.id), { item_value: parseLocalizedNumber(v) })}
						className='w-full px-3'
					/>
				</div>
			</div>

			<div className='grid grid-cols-1'>
				<EditableBox
					icon={<FileText className='h-3.5 w-3.5 text-middle-blue/70' />}
					label='Description'
					value={currentDesc}
					placeholder='Short description…'
					mode='textarea'
					onCommit={v => onUpdateItem?.(String(i.id), { item_note: String(v ?? '').trim() })}
					className='w-full'
				/>
			</div>

			<div className='sm:hidden'>
				<button
					type='button'
					onClick={() => setExpandedMobile(v => !v)}
					className='mt-1 inline-flex items-center gap-2 text-[13px] text-middle-blue hover:underline'>
					{expandedMobile ? 'Show less' : 'Show more'}
				</button>
			</div>

			<div className={`${expandedMobile ? 'grid' : 'hidden'} grid-cols-1 md:grid md:grid-cols-12 gap-2`}>
				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<ListOrdered className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Quantity'
						value={String(qty)}
						mode='number'
						placeholder='1'
						onCommit={v => {
							const n = Number(v)
							onUpdateItem?.(String(i.id), { item_quantity: Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1 })
						}}
						className='w-full'
					/>
				</div>

				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<Scale className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Weight'
						value={weight ? String(weight) : ''}
						placeholder='0 kg'
						mode='number'
						suffix='kg'
						onCommit={v => onUpdateItem?.(String(i.id), { item_weight: parseLocalizedNumber(v) })}
						className='w-full'
					/>
				</div>

				<div className='md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2'>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Width'
						value={dims.width_cm ? String(dims.width_cm) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_width: parseLocalizedNumber(v) })}
						className='w-full'
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Height'
						value={dims.height_cm ? String(dims.height_cm) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_height: parseLocalizedNumber(v) })}
						className='w-full'
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5 text-middle-blue/70' />}
						label='Length'
						value={dims.length_cm ? String(dims.length_cm) : ''}
						placeholder='0 cm'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_length: parseLocalizedNumber(v) })}
						className='w-full'
					/>
				</div>

				<div className='md:col-span-2 min-w-0 flex items-center'>
					<ActionBox
						label='Photos'
						actionText='Add'
						icon={<Plus className='h-3.5 w-3.5' />}
						onClick={() => fileInputRef.current?.click()}
						className='w-full'
					/>
				</div>
			</div>

			{images.length > 0 && (
				<div className='mt-3'>
					<div className='flex flex-wrap gap-2 overflow-visible'>
						{images.map((img, idx) => {
							const attId = (img as any)?.id
							const key = String(attId ?? idx)
							const src = signedMap[key] || ''
							const title = (img as any)?.file_name || `image-${idx + 1}`
							const loading = String(attId ?? '').startsWith('temp-') || (img as any)?.mime_type === 'pef/loading'

							return (
								<div
									key={key}
									className='group/thumb relative h-14 w-14 rounded-md border border-middle-blue/15 bg-white overflow-visible'
									title={title}>
									<button
										type='button'
										className='block h-full w-full text-left rounded-md overflow-hidden cursor-zoom-in'
										onClick={() => {
											if (src && !loading) setPreviewUrl(src)
											if (onThumbClick) onThumbClick(String(i.id), { ...(img as any), file_url: src } as ClientFile)
										}}
										title='Click to preview'
										disabled={loading}>
										{src ? (
											<img
												src={src}
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
											<Loader2 className='h-4 w-4 animate-spin text-middle-blue' />
										</div>
									)}

									{onRemoveImage ? (
										<button
											type='button'
											title={loading ? 'Uploading…' : 'Remove'}
											onClick={e => {
												e.preventDefault()
												e.stopPropagation()
												if (!loading && attId) setConfirmImgId(String(attId))
											}}
											disabled={loading || !attId}
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

			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				multiple
				className='hidden'
				onChange={e => {
					if (e.currentTarget.files?.length && onAddImages) {
						onAddImages(String(i.id), e.currentTarget.files)
						e.currentTarget.value = ''
					}
				}}
			/>

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
					if (confirmImgId) onRemoveImage?.(String(i.id), String(confirmImgId))
					setConfirmImgId(null)
				}}
				onCancel={() => setConfirmImgId(null)}
			/>

			<UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
		</div>
	)
}

export default ItemsListRow
