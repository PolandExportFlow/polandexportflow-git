'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
	Tag,
	Package,
	Link2,
	Coins,
	Grid3x3,
	Scale,
	Ruler,
	ChevronDown,
	X,
	StickyNote,
	Paperclip,
	Loader2,
	Trash2,
	PackagePlus,
	AlertTriangle,
	AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import UniversalStep from '../common/UniversalStep'
import UniversalAttachmentInput from '@/components/ui/UniversalAttachmentInput'
import UniversalImageModal from '@/components/ui/UniversalImageModal'
import UniversalConfirmModal from '@/components/ui/UniversalConfirmModal'
import { ensurePreviewableImages } from '@/utils/convertImages'
import UniversalInput from '@/components/ui/UniwersalInput'
// Import helperów
import { toQtyString, toQty, hasPositiveValue, isNonEmptyString } from '@/utils/newRequestFormHelper'

export type Item = {
	id: string
	expanded: boolean
	item_name: string
	item_url?: string | null
	item_note?: string | null
	item_quantity: string
	item_value: string
	item_weight?: string
	item_length?: string
	item_width?: string
	item_height?: string
	files: File[]
}

/** Tworzy pusty wiersz przedmiotu */
export const newItem = (): Item => ({
	id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	expanded: false,
	item_name: '',
	item_url: '',
	item_note: '',
	item_quantity: '1',
	item_value: '',
	item_weight: '',
	item_length: '',
	item_width: '',
	item_height: '',
	files: [],
})

export default function ItemsStep({
	items,
	onItemsChange,
	onContinue,
	onBack,
}: {
	items: Item[]
	onItemsChange: (next: Item[]) => void
	onContinue?: () => void
	onBack?: () => void
}) {
	const updateItem = (id: string, patch: Partial<Item>) =>
		onItemsChange(items.map(i => (i.id === id ? { ...i, ...patch } : i)))

	const removeItem = (id: string) => onItemsChange(items.filter(i => i.id !== id))
	const addItem = () => onItemsChange([...items, newItem()])

	// Walidacja: Sprawdzamy, czy każdy przedmiot ma nazwę, link, cenę > 0 i ilość >= 1
	const canContinue = useMemo(
		() =>
			items.length > 0 &&
			items.every(
				i =>
					isNonEmptyString(i.item_name) &&
					hasPositiveValue(i.item_value) &&
					isNonEmptyString(i.item_url) &&
					toQty(i.item_quantity) >= 1
			),
		[items]
	)

	return (
		<UniversalStep
			icon={<Tag className='h-6 w-6 md:w-7 md:h-7 text-middle-blue' />}
			title='Shipment contents'
			onBack={onBack}
			onContinue={canContinue ? onContinue : undefined}
			continueLabel='Continue'
			contentClassName='space-y-4'>
			<div className='space-y-3'>
				{items.map((it, idx) => (
					<ProductCard
						key={it.id}
						index={idx + 1}
						item={it}
						onChange={patch => updateItem(it.id, patch)}
						onRemove={() => removeItem(it.id)}
						onToggle={() => updateItem(it.id, { expanded: !it.expanded })}
					/>
				))}

				<div className='py-4 text-right mx-auto opacity-70'>
					<p className='flex items-center justify-end gap-2 px-3'>
						<AlertTriangle className='w-4 h-4 text-dark-blue' />
						<a
							href='/prohibited-items'
							target='_blank'
							rel='noopener noreferrer'
							className='font-medium hover:text-dark-blue underline underline-offset-2'>
							List of items we cannot ship
						</a>
					</p>
				</div>
			</div>

			{/* Przycisk Add Product - zmieniony kolor z zielonego na ciemnoniebieski */}
			<button
				type='button'
				onClick={addItem}
				className='inline-flex items-center justify-center gap-2 rounded-md   bg-middle-blue py-4 md:py-5 text-[12px] md:text-[13px] w-full text-white hover:bg-green transition-colors duration-300 font-made_light tracking-wide mb-2'>
				<PackagePlus className='h-4.5 w-4.5' />
				<span>Add Another Product</span>
			</button>

			{/* Walidacja - komunikat blokujący przejście dalej */}
			{!canContinue && (
				<div className='mt-4 flex items-center justify-center gap-2 text-[13px] text-middle-blue/70 bg-middle-blue/5 border border-middle-blue/10 p-4 rounded-md animate-in fade-in'>
					<AlertCircle className='h-4 w-4 text-middle-blue' />
					<span>
						Please ensure all items have a <b>Product name</b>, <b>Price</b>, and <b>Link</b> (if no link, type "N/A" or a dot).
					</span>
				</div>
			)}
		</UniversalStep>
	)
}

function ProductCard({
	index,
	item,
	onChange,
	onRemove,
	onToggle,
}: {
	index: number
	item: Item
	onChange: (patch: Partial<Item>) => void
	onRemove: () => void
	onToggle: () => void
}) {
	const set = (k: keyof Item) => (v: any) => onChange({ [k]: v })
	// Użycie helpera doQtyString
	const setQty = (val: any) => onChange({ item_quantity: toQtyString(val) })

	const quickFileInputRef = useRef<HTMLInputElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [isConverting, setIsConverting] = useState(false)

	const addFiles = (converted: File[]) => {
		if (!converted?.length) return
		onChange({ files: [...(item.files ?? []), ...converted] })
	}

	const handleQuickFiles = async (filesList: FileList | null) => {
		if (!filesList || filesList.length === 0) return
		try {
			setIsConverting(true)
			const converted = await ensurePreviewableImages(filesList)
			addFiles(converted)
		} finally {
			setIsConverting(false)
			if (quickFileInputRef.current) quickFileInputRef.current.value = ''
		}
	}

	const onDropQuick: React.DragEventHandler<HTMLButtonElement> = async ev => {
		ev.preventDefault()
		setIsDragging(false)
		await handleQuickFiles(ev.dataTransfer?.files || null)
	}
	const onDragOverQuick: React.DragEventHandler<HTMLButtonElement> = ev => {
		ev.preventDefault()
		setIsDragging(true)
	}
	const onDragLeaveQuick: React.DragEventHandler<HTMLButtonElement> = () => setIsDragging(false)

	const [thumbUrls, setThumbUrls] = useState<string[]>([])
	const [selectedThumbUrl, setSelectedThumbUrl] = useState<string | null>(null)
	const [confirmIdx, setConfirmIdx] = useState<number | null>(null)

	useEffect(() => {
		const u = (item.files ?? []).map(f => URL.createObjectURL(f))
		setThumbUrls(u)
		return () => u.forEach(URL.revokeObjectURL)
	}, [item.files])

	const removeFileAt = (idx: number) => {
		const next = (item.files ?? []).filter((_, i) => i !== idx)
		onChange({ files: next })
	}

	const confirmDelete = async () => {
		if (confirmIdx == null) return
		removeFileAt(confirmIdx)
		setConfirmIdx(null)
	}

	return (
		<div className='relative rounded-lg border-2 bg-ds-light-blue p-3 md:p-5 border-middle-blue/15 overflow-x-hidden'>
			<div className='flex items-center justify-between border-b-1 border-ds-middle-blue pb-3 mb-2 md:mb-3'>
				<div className='text-[14px] p-2 text-middle-blue font-heebo_medium'>#{index}</div>
				<button
					type='button'
					onClick={onRemove}
					className='inline-flex items-center rounded-md p-2 md:p-3 text-middle-blue/80 hover:text-red hover:bg-red/10 transition'
					aria-label='Remove item'
					title='Remove item'>
					<X className='h-4 w-4' />
				</button>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-1 sm:gap-3'>
				<UniversalInput
					label='Product name'
					name={`item_name-${item.id}`}
					value={item.item_name}
					onChange={set('item_name')}
					placeholder='e.g., Xiaomi cordless drill'
					required
					leftIcon={Package}
				/>

				<UniversalInput
					label='Product link'
					name={`item_url-${item.id}`}
					value={item.item_url ?? ''}
					onChange={set('item_url')}
					placeholder='https://allegro.pl/...'
					leftIcon={Link2}
					autoComplete='off'
					required
				/>

				<div className='grid grid-cols-2 gap-3'>
					<UniversalInput
						label='Value'
						name={`item_value-${item.id}`}
						type='number'
						value={item.item_value}
						onChange={set('item_value')}
						placeholder='0.00'
						required
						inputMode='decimal'
						step='0.01'
						min='0.01'
						suffix='PLN'
						leftIcon={Coins}
					/>

					{/* Quick Image Upload Zone */}
					<div className='flex flex-col mt-4'>
						<label className='block mb-2 ml-0.5 font-medium text-dark-blue'>
							<span className='inline-flex items-center gap-2'>
								<Paperclip className='h-4 w-4 text-middle-blue' />
								Attachments
							</span>
						</label>

						<input
							ref={quickFileInputRef}
							type='file'
							accept='image/*'
							multiple
							className='sr-only'
							onChange={e => handleQuickFiles(e.currentTarget.files)}
						/>

						<button
							type='button'
							title='Drag & drop or click'
							aria-label='Add images'
							onClick={() => quickFileInputRef.current?.click()}
							onDrop={onDropQuick}
							onDragOver={onDragOverQuick}
							onDragLeave={onDragLeaveQuick}
							className={clsx(
								'relative rounded-md bg-white transition-colors',
								'h-[52px] md:h-[72px] flex items-center justify-center',
								'border border-dashed border-middle-blue/40 hover:border-green hover:bg-green/15',
								'focus:outline-none focus:ring-2 focus:ring-middle-blue/15',
								isDragging ? '!border-green !bg-green/15' : ''
							)}>
							{isConverting ? (
								<Loader2 className='h-4 w-4 md:h-5 md:w-5 animate-spin text-middle-blue/80' />
							) : (
								<Paperclip className='h-4 w-4 md:h-5 md:w-5 text-middle-blue/80' />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Thumbnails */}
			{thumbUrls.length > 0 && (
				<div className='mt-3'>
					<div className='flex flex-wrap gap-2 overflow-visible'>
						{thumbUrls.map((u, i) => (
							<div
								key={i}
								className='group relative h-14 w-14 rounded-md border border-middle-blue/15 bg-white overflow-visible'
								title={item.files[i]?.name || `image-${i + 1}`}>
								<button
									type='button'
									className='block h-full w-full text-left rounded-md overflow-hidden'
									onClick={() => setSelectedThumbUrl(u)}
									onMouseDown={e => e.preventDefault()}
									title='Click to preview'>
									<img src={u} alt='' className='h-full w-full object-cover transition group-hover:brightness-60' />
								</button>

								<button
									type='button'
									title='Remove'
									onClick={e => {
										e.preventDefault()
										e.stopPropagation()
										setConfirmIdx(i)
									}}
									className={clsx(
										'absolute top-0 right-0 translate-x-1/3 -translate-y-1/3',
										'z-20 inline-flex items-center justify-center h-6 w-6 rounded-full text-white',
										'bg-middle-blue hover:bg-red transition-colors duration-150',
										'shadow-lg focus:outline-none focus:ring-2 focus:ring-white/70'
									)}>
									<Trash2 className='h-3.5 w-3.5' />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			<UniversalImageModal selectedPhoto={selectedThumbUrl} onClose={() => setSelectedThumbUrl(null)} />

			<UniversalConfirmModal
				open={confirmIdx !== null}
				onCancel={() => setConfirmIdx(null)}
				onConfirm={confirmDelete}
				title='Delete attachment?'
				description='This action cannot be undone. Are you sure you want to remove this image?'
				confirmText='Delete'
				cancelText='Cancel'
				tone='danger'
				size='md'
			/>

			<div className='mt-3'>
				<button
					type='button'
					onClick={onToggle}
					className={clsx(
						'w-full inline-flex items-center justify-center gap-2 rounded-md border text-[12px] md:text-[13px] font-made_light',
						'px-3 py-4 transition',
						item.expanded
							? 'bg-middle-blue/8 border-middle-blue/20 text-middle-blue'
							: 'bg-light-blue border-middle-blue/10 text-middle-blue/80 hover:bg-middle-blue/8'
					)}
					aria-expanded={item.expanded}>
					<span>{item.expanded ? 'Hide details' : 'More details'}</span>
					<ChevronDown className='h-4 w-4 transition-transform' />
				</button>
			</div>

			{item.expanded && (
				<div className='space-y-3 mt-2 md:mt-4'>
					<div className='grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-3'>
						<UniversalInput
							label='Quantity'
							name={`item_quantity-${item.id}`}
							type='number'
							value={item.item_quantity}
							onChange={setQty}
							placeholder='1'
							inputMode='numeric'
							step={1}
							min={1}
							leftIcon={Grid3x3}
						/>
						<UniversalInput
							label='Weight (kg)'
							name={`item_weight-${item.id}`}
							type='number'
							value={item.item_weight ?? ''}
							onChange={set('item_weight')}
							placeholder='0.0'
							inputMode='decimal'
							step='0.01'
							suffix='kg'
							leftIcon={Scale}
						/>
						<UniversalInput
							label='Length (cm)'
							name={`item_length-${item.id}`}
							type='number'
							value={item.item_length ?? ''}
							onChange={set('item_length')}
							placeholder='0.0'
							inputMode='decimal'
							step='0.1'
							suffix='cm'
							leftIcon={Ruler}
						/>
						<UniversalInput
							label='Width (cm)'
							name={`item_width-${item.id}`}
							type='number'
							value={item.item_width ?? ''}
							onChange={set('item_width')}
							placeholder='0.0'
							inputMode='decimal'
							step='0.1'
							suffix='cm'
							leftIcon={Ruler}
						/>
						<UniversalInput
							label='Height (cm)'
							name={`item_height-${item.id}`}
							type='number'
							value={item.item_height ?? ''}
							onChange={set('item_height')}
							placeholder='0.0'
							inputMode='decimal'
							step='0.1'
							suffix='cm'
							leftIcon={Ruler}
						/>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-3'>
						<UniversalInput
							label='Description'
							name={`item_note-${item.id}`}
							type='textarea'
							value={item.item_note ?? ''}
							onChange={set('item_note')}
							placeholder='What exactly is inside? Model, variant, extras…'
							leftIcon={StickyNote}
							className='h-[120px] md:h-[140px]'
						/>

						<div className='w-full mt-4'>
							<UniversalAttachmentInput
								label='Product images'
								files={item.files ?? []}
								onAddFiles={converted => addFiles(converted)}
								onRemoveAt={idx => setConfirmIdx(idx)}
								accept='image/*'
								multiple
								minHeight={140}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
