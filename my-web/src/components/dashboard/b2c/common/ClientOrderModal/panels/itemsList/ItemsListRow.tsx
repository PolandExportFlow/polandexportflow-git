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
import type { ItemsPanelRowDB as Item, ClientFile } from '../../clientOrderTypes'
import { supabase } from '@/utils/supabase/client'
import clsx from 'clsx'

type Props = {
	item: Item | undefined | null
	alt?: boolean
	canEdit?: boolean
	onUpdateItem?: (itemId: string, patch: Partial<Item>) => void
	onAddImages?: (itemId: string, files: FileList) => void
	onRemoveImage?: (itemId: string | number, imageId: string | number) => void
	onThumbClick?: (itemId: string, image: ClientFile) => void
	onDeleteItem?: (itemId: string) => void
}

const ItemsListRow: React.FC<Props> = ({
	item,
	alt = false,
	canEdit = true,
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

	// --- Drag & Drop Logic ---
	const [isRowDragOver, setIsRowDragOver] = useState(false)
	const dragDepthRef = useRef(0)

	// GŁÓWNY KONTENER: Wykrywa wejście drag
	const onRowDragEnter: React.DragEventHandler<HTMLDivElement> = e => {
		if (!canEdit) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current += 1
		setIsRowDragOver(true)
	}

	const onRowDragLeave: React.DragEventHandler<HTMLDivElement> = e => {
		if (!canEdit) return
		e.preventDefault()
		e.stopPropagation()
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
		if (dragDepthRef.current === 0) setIsRowDragOver(false)
	}

	// TARCZA / DROP ZONE: To ona odbiera drop
	const onShieldDrop: React.DragEventHandler<HTMLDivElement> = async e => {
		if (!canEdit) return
		e.preventDefault() // ZATRZYMUJE DOMYŚLNE ZACHOWANIE (otwieranie pliku / wklejanie)
		e.stopPropagation() // ZATRZYMUJE BĄBELKOWANIE DO INPUTÓW

		setIsRowDragOver(false)
		dragDepthRef.current = 0

		const files = Array.from(e.dataTransfer?.files || [])

		// Jeśli upuszczono pliki, dodajemy je
		if (files.length > 0 && onAddImages) {
			const dt = new DataTransfer()
			for (const f of files) dt.items.add(f)
			onAddImages(String(i.id), dt.files)
		}
		// Jeśli to nie pliki (np. tekst linku), nic nie robimy.
		// Dzięki preventDefault wyżej, tekst NIE wpadnie do inputów.
	}

	// --- Images Preview Logic ---
	const imagesKey = useMemo(() => images.map(img => `${img.id}|${img.storage_path}`).join('~'), [images])
	const [signedMap, setSignedMap] = useState<Record<string, string>>({})

	useEffect(() => {
		let cancelled = false
		async function ensureSigned() {
			if (!images.length) return
			const pairs = await Promise.all(
				images.map(async (img, idx) => {
					const key = String(img.id ?? idx)
					const raw = img.storage_path || ''
					const fileUrl = (img as any)?.file_url
					if (fileUrl && String(fileUrl).startsWith('blob:')) return [key, fileUrl] as const
					if (/^https?:\/\//i.test(raw)) return [key, raw] as const
					if (raw && img.id && !String(img.id).startsWith('temp-')) {
						try {
							const { data } = await supabase.functions.invoke('user_order_file_get_url', { body: { file_id: img.id } })
							if (data?.url) return [key, data.url] as const
						} catch {}
					}
					return [key, ''] as const
				})
			)
			if (!cancelled) {
				const next: Record<string, string> = {}
				for (const [k, v] of pairs) next[k] = v
				setSignedMap(next)
			}
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
			// Ważne: blokujemy dragover na głównym kontenerze, żeby drop zone mógł działać
			onDragOver={e => {
				e.preventDefault()
			}}
			onDragLeave={onRowDragLeave}
			onDrop={onShieldDrop}>
			{isRowDragOver && canEdit && (
				<div
					className='absolute inset-0 z-40 grid place-items-center rounded-lg border-2 border-dashed border-green/70 bg-green/10 cursor-copy'
					// Tarcza odbiera drop bezpośrednio
					onDrop={onShieldDrop}
					onDragOver={e => {
						e.preventDefault()
						e.dataTransfer.dropEffect = 'copy'
					}}
					onDragLeave={onRowDragLeave}>
					<div className='flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 border border-middle-blue/20 pointer-events-none'>
						<UploadCloud className='h-4 w-4' />
						<span className='text-[13px] md:text-[14px] text-middle-blue/90'>Drop images to add</span>
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
						{canEdit && (
							<button
								onClick={() => setConfirmOpen(true)}
								className='p-2 sm:p-3 rounded-lg text-middle-blue opacity-60 hover:opacity-100 hover:bg-middle-blue/10 transition'
								title='Delete item'>
								<Trash2 className='w-4 h-4 sm:w-5 sm:h-5' />
							</button>
						)}
					</div>
					{canEdit && (
						<button
							onClick={() => setConfirmOpen(true)}
							className='sm:hidden p-2 rounded-lg text-middle-blue opacity-80 hover:opacity-100 hover:bg-middle-blue/10 transition shrink-0'
							title='Delete item'>
							<Trash2 className='w-4 h-4' />
						</button>
					)}
				</div>
				<div className='mt-2 sm:hidden'>{StatusEl}</div>
				<div className='mt-2 h-px bg-middle-blue/10' />
			</div>

			{/* FIELDS */}
			<div className='grid grid-cols-1 gap-2 md:grid md:grid-cols-12'>
				<div className='min-w-0 md:col-span-6 text-[15px] md:text-[16px]'>
					<EditableBox
						icon={<Tag className='h-3.5 w-3.5' />}
						label='Name'
						value={i.item_name ?? ''}
						placeholder='Name…'
						onCommit={v => onUpdateItem?.(String(i.id), { item_name: v })}
						className='w-full'
						disabled={!canEdit}
					/>
				</div>
				<div className='min-w-0 md:col-span-4'>
					<EditableBox
						icon={<LinkIcon className='h-3.5 w-3.5' />}
						label='Link'
						value={link}
						placeholder='https://…'
						onCommit={v => onUpdateItem?.(String(i.id), { item_url: v })}
						className='w-full'
						disabled={!canEdit}
						after={
							link ? (
								<a href={safeHttp(link)} target='_blank' className='opacity-70 hover:opacity-100'>
									<ExternalLink className='h-3.5 w-3.5' />
								</a>
							) : null
						}
					/>
				</div>
				<div className='min-w-0 md:col-span-2 text-[13px]'>
					<EditableBox
						icon={<Banknote className='h-3.5 w-3.5' />}
						label='Price'
						value={strNumber(unitValue)}
						mode='number'
						placeholder='0.00'
						suffix='PLN'
						onCommit={v => onUpdateItem?.(String(i.id), { item_value: parseLocalizedNumber(v) })}
						className='w-full px-3'
						disabled={!canEdit}
					/>
				</div>
			</div>

			<div className='grid grid-cols-1'>
				<EditableBox
					icon={<FileText className='h-3.5 w-3.5' />}
					label='Description'
					value={currentDesc}
					placeholder='Short description…'
					mode='textarea'
					onCommit={v => onUpdateItem?.(String(i.id), { item_note: v })}
					className='w-full'
					disabled={!canEdit}
				/>
			</div>

			{/* MOBILE TOGGLE */}
			<div className='sm:hidden'>
				<button
					onClick={() => setExpandedMobile(v => !v)}
					className='mt-1 inline-flex items-center gap-2 text-[13px] text-middle-blue hover:underline'>
					{expandedMobile ? 'Show less' : 'Show more'}
				</button>
			</div>

			{/* EXPANDABLE FIELDS */}
			<div className={`${expandedMobile ? 'grid' : 'hidden'} grid-cols-1 md:grid md:grid-cols-12 gap-2`}>
				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<ListOrdered className='h-3.5 w-3.5' />}
						label='Quantity'
						value={String(qty)}
						mode='number'
						placeholder='1'
						onCommit={v => onUpdateItem?.(String(i.id), { item_quantity: Math.max(1, Math.round(Number(v))) })}
						className='w-full'
						disabled={!canEdit}
					/>
				</div>
				<div className='md:col-span-2 min-w-0'>
					<EditableBox
						icon={<Scale className='h-3.5 w-3.5' />}
						label='Weight'
						value={weight ? String(weight) : ''}
						placeholder='0 kg'
						mode='number'
						suffix='kg'
						onCommit={v => onUpdateItem?.(String(i.id), { item_weight: parseLocalizedNumber(v) })}
						className='w-full'
						disabled={!canEdit}
					/>
				</div>
				<div className='md:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2'>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5' />}
						label='Width'
						value={strNumber(dims.width_cm)}
						placeholder='0'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_width: parseLocalizedNumber(v) })}
						className='w-full'
						disabled={!canEdit}
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5' />}
						label='Height'
						value={strNumber(dims.height_cm)}
						placeholder='0'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_height: parseLocalizedNumber(v) })}
						className='w-full'
						disabled={!canEdit}
					/>
					<EditableBox
						icon={<Ruler className='h-3.5 w-3.5' />}
						label='Length'
						value={strNumber(dims.length_cm)}
						placeholder='0'
						mode='number'
						suffix='cm'
						onCommit={v => onUpdateItem?.(String(i.id), { item_length: parseLocalizedNumber(v) })}
						className='w-full'
						disabled={!canEdit}
					/>
				</div>
				<div className='md:col-span-2 min-w-0 flex items-center'>
					<ActionBox
						label='Photos'
						actionText='Add'
						icon={<Plus className='h-3.5 w-3.5' />}
						onClick={() => fileInputRef.current?.click()}
						className='w-full'
						disabled={!canEdit}
					/>
				</div>
			</div>

			{/* THUMBNAILS */}
			{images.length > 0 && (
				<div className='mt-3'>
					<div className='flex flex-wrap gap-2 overflow-visible'>
						{images.map((img, idx) => {
							const key = String(img.id ?? idx)
							const src = signedMap[key] || ''
							const loading = String(img.id).startsWith('temp-')
							return (
								<div
									key={key}
									className='group/thumb relative h-14 w-14 rounded-md border border-middle-blue/15 bg-white overflow-visible'
									title={img.file_name}>
									<button
										onClick={() => {
											if (src && !loading && onThumbClick)
												onThumbClick(String(i.id), { ...img, file_url: src } as ClientFile)
										}}
										className='block h-full w-full rounded-md overflow-hidden cursor-zoom-in'
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
											<div className='text-[10px] p-1 text-center text-middle-blue/60'>{img.file_name}</div>
										)}
									</button>
									{loading && (
										<div className='absolute inset-0 bg-white/60 grid place-items-center'>
											<Loader2 className='h-4 w-4 animate-spin text-middle-blue' />
										</div>
									)}
									{canEdit && (
										<button
											onClick={() => {
												if (!loading && img.id) setConfirmImgId(String(img.id))
											}}
											disabled={loading}
											className='absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 z-20 inline-flex items-center justify-center h-6 w-6 rounded-full text-white bg-middle-blue hover:bg-red opacity-100 md:opacity-0 md:group-hover/thumb:opacity-100 transition shadow-md'>
											<X className='h-3.5 w-3.5' />
										</button>
									)}
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

			{/* MODALS */}
			<UniversalConfirmModal
				open={confirmOpen}
				title='Delete item?'
				confirmText='Delete'
				cancelText='Cancel'
				tone='danger'
				onConfirm={() => {
					onDeleteItem?.(String(i.id))
					setConfirmOpen(false)
				}}
				onCancel={() => setConfirmOpen(false)}
			/>
			<UniversalConfirmModal
				open={confirmImgId !== null}
				title='Remove image?'
				confirmText='Remove'
				cancelText='Cancel'
				tone='danger'
				size='sm'
				onConfirm={() => {
					if (confirmImgId) onRemoveImage?.(String(i.id), confirmImgId)
					setConfirmImgId(null)
				}}
				onCancel={() => setConfirmImgId(null)}
			/>
			<UniversalImageModal selectedPhoto={previewUrl} onClose={() => setPreviewUrl(null)} />
		</div>
	)
}

export default ItemsListRow
