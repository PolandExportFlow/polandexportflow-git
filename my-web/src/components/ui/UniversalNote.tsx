'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Save, Edit3, X } from 'lucide-react'

type Props = {
	/** Uniwersalny identyfikator (orderId, userId, addressId, …) */
	targetId?: string
	title?: string
	initialNote?: string
	/**
	 * Uniwersalny zapis. Zwróć finalny tekst jeśli backend normalizuje,
	 * w innym wypadku nic nie zwracaj, zapisze się `draft`.
	 */
	onSave?: (targetId: string | undefined, note: string) => Promise<string | void> | void
}

const PAPER_BG = '#FFF7A6'
const PAPER_TEXT = '#5d5300'
const TAPE = '#F2E58F'
const CORNER = 52
const BORDER = '#E9DB72'
const ACTIONS_H = 56

export default function UniversalNote({ title, initialNote, targetId, onSave }: Props) {
	const [note, setNote] = useState<string>(initialNote ?? '')
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState<string>(initialNote ?? '')
	const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const taRef = useRef<HTMLTextAreaElement | null>(null)

	// 🔄 sync po zmianie initialNote (np. po refreshu)
	useEffect(() => {
		const next = initialNote ?? ''
		setNote(next)
		if (!editing) setDraft(next)
	}, [initialNote, editing])

	const autosize = () => {
		const el = taRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${el.scrollHeight}px`
	}

	useEffect(() => {
		if (editing) autosize()
	}, [editing, draft])

	const startEdit = () => {
		setDraft(note ?? '')
		setEditing(true)
		setTimeout(() => taRef.current?.focus(), 0)
	}

	const cancelEdit = () => {
		setEditing(false)
		setDraft(note ?? '')
		setSaving('idle')
	}

	const changed = useMemo(() => (draft ?? '').trim() !== (note ?? '').trim(), [draft, note])

	const saveNote = async () => {
		if (!changed) {
			setEditing(false)
			return
		}
		try {
			setSaving('saving')
			const maybeNext = await onSave?.(targetId, draft)
			const nextVal = typeof maybeNext === 'string' ? maybeNext : draft
			setNote(nextVal)
			setSaving('saved')
			setTimeout(() => setSaving('idle'), 900)
			setEditing(false)
		} catch {
			setSaving('error')
			setTimeout(() => setSaving('idle'), 1200)
		}
	}

	const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault()
			void saveNote()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			cancelEdit()
		}
	}

	const padBottom = CORNER + (editing ? ACTIONS_H + 12 : 0)

	return (
		<div className='relative' style={{ filter: 'drop-shadow(0 8px 18px rgba(16,42,67,0.12))' }}>
			<div
				className='relative flex flex-col rounded-[20px]'
				style={{
					backgroundColor: PAPER_BG,
					color: PAPER_TEXT,
					paddingBottom: padBottom,
					clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${CORNER}px), calc(100% - ${CORNER}px) 100%, 0 100%)`,
					border: `1px solid ${BORDER}`,
				}}>
				{/* NAGŁÓWEK: 3 kolumny (tytuł | pinezka | edycja) */}
				<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-6 pt-4'>
					<div className='text-[13px] tracking-wide opacity-80 truncate'>{title ?? 'Notatka'}</div>

					{/* pinezka / taśma (środek) */}
					<div className='mx-2 flex items-center justify-center'>
						<div
							className='w-24 h-3 rounded-full shadow-sm'
							style={{ backgroundColor: TAPE, opacity: 0.9 }}
							aria-hidden
						/>
					</div>

					{/* przycisk edycji (prawa strona nagłówka) */}
					<div className='flex justify-end'>
						{!editing && (
							<button
								onClick={startEdit}
								className='inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] text-[#5d5300]/70 hover:text-[#5d5300] hover:bg-white/40 transition-colors'
								title='Edytuj notatkę'>
								<Edit3 className='w-4 h-4' />
								Edytuj
							</button>
						)}
					</div>
				</div>

				{/* TREŚĆ */}
				<div className='p-4'>
					{editing ? (
						<>
							<textarea
								ref={taRef}
								value={draft}
								onChange={e => {
									setDraft(e.target.value)
									autosize()
								}}
								onInput={autosize}
								onKeyDown={onKeyDown}
								placeholder='Twoja notatka…'
								className='w-full outline-none focus:ring-0 font-heebo_regular bg-white rounded-xl border resize-y p-4
             text-[15px] leading-7 tracking-normal placeholder:text-[14px] placeholder:opacity-60'
								rows={10}
								style={{
									minHeight: '120px',
									height: 'auto',
									color: PAPER_TEXT,
									borderColor: BORDER,
									lineHeight: 1.7,
								}}
							/>

							<div className='flex items-center justify-between mt-3 pb-1' style={{ height: ACTIONS_H }}>
								<button
									onClick={cancelEdit}
									className='inline-flex items-center justify-center gap-1.5 px-3 py-2 font-heebo_regular rounded text-sm opacity-80 hover:opacity-100'
									style={{ color: PAPER_TEXT }}
									title='Anuluj (Esc)'>
									<X className='w-4 h-4' />
									<span>Anuluj</span>
								</button>

								<button
									onClick={saveNote}
									disabled={saving === 'saving' || !changed}
									className={[
										'inline-flex items-center justify-center gap-2 px-5 py-2.5 font-heebo_regular bg-middle-blue rounded-lg text-sm text-white transition',
										saving === 'saving' || !changed ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
									].join(' ')}
									title='Zapisz (Ctrl/Cmd+Enter)'>
									{saving === 'saving' ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
									<span>Zapisz</span>
								</button>
							</div>
						</>
					) : (
						<div
							className='whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl bg-white/40 p-5 pb-6
             font-heebo_regular text-[14px] leading-7 md:leading-8 tracking-normal opacity-90'
							style={{ lineHeight: 1.75 }}>
							{note?.trim() || '— kliknij „Edytuj”, aby dodać notatkę —'}
						</div>
					)}

					{/* Status */}
					{saving !== 'idle' && (
						<div className='mt-1 text-[12px] text-middle-blue/70'>
							{saving === 'saving' && 'Zapisywanie…'}
							{saving === 'saved' && 'Zapisano.'}
							{saving === 'error' && 'Błąd zapisu.'}
						</div>
					)}
				</div>
			</div>

			{/* Zagięty róg */}
			<div className='pointer-events-none absolute right-0 bottom-0' style={{ width: CORNER, height: CORNER }}>
				<div
					className='absolute inset-0'
					style={{ backgroundColor: BORDER, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
				/>
			</div>
		</div>
	)
}
