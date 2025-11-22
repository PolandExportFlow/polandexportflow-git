'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Edit3, Trash2, Pin, Plus, Package, Banknote, Users } from 'lucide-react'
import { SectionId } from '../../../types'
import UniversalAdminCard from '../../../utils/UniversalAdminCard'
import { useNotes } from './useNotes'
import ConfirmModal from '@/components/ui/UniversalConfirmModal'
import { AdminNote, NoteCategory } from './notesTypes'

interface NoteWidgetProps {
	onNavigate?: (section: SectionId) => void
}

const TABS = [
	{ id: 'paczki', label: 'Paczki', icon: Package },
	{ id: 'finanse', label: 'Finanse', icon: Banknote },
	{ id: 'klienci', label: 'Klienci', icon: Users },
] as const satisfies ReadonlyArray<{ id: NoteCategory; label: string; icon: React.ComponentType<any> }>

const PALETTE: Record<NoteCategory, { light: string; strong: string; lightBorder: string }> = {
	paczki: { light: '#EAF4FF', strong: '#1D5FE5', lightBorder: '#D6E9FF' },
	finanse: { light: '#EAF9F1', strong: '#0C9B76', lightBorder: '#D2EFE2' },
	klienci: { light: '#FFF6E6', strong: '#C97B14', lightBorder: '#F5E4C6' },
}

const CARD_THEME: Record<NoteCategory, { paperBg: string; cornerBg: string; text: string; icon: string }> = {
	paczki: { paperBg: '#E0EEFF', cornerBg: '#C8E0FF', text: '#144AB3', icon: '#1D5FE5' },
	finanse: { paperBg: '#ECFAF3', cornerBg: '#CFEDE2', text: '#075A46', icon: '#0C9B76' },
	klienci: { paperBg: '#FFF7EC', cornerBg: '#F3E1C5', text: '#7A4B07', icon: '#C97B14' },
}

const CORNER = 56
const TAB_H = 'h-14'

export default function NoteWidget({ onNavigate }: NoteWidgetProps) {
	const [activeTab, setActiveTab] = useState<NoteCategory>('paczki')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editContent, setEditContent] = useState('')
	const [pendingDelete, setPendingDelete] = useState<{ id: string; content: string } | null>(null)

	const { notes, loading, add, edit, remove, togglePin } = useNotes(activeTab)

	const taRef = useRef<HTMLTextAreaElement | null>(null)
	const autosize = () => {
		const el = taRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${el.scrollHeight}px`
	}
	useEffect(() => {
		if (editingId) autosize()
	}, [editingId, editContent])

	const filteredNotes = useMemo(() => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned)), [notes])

	const addEmptyNote = async () => {
		const created = await add({ category: activeTab, content: '' })
		setEditingId(created.id)
		setEditContent('')
	}

	const askDeleteNote = (note: AdminNote) => setPendingDelete({ id: note.id, content: note.content || '' })

	const confirmDelete = async () => {
		if (!pendingDelete) return
		await remove(pendingDelete.id)
		if (editingId === pendingDelete.id) {
			setEditingId(null)
			setEditContent('')
		}
		setPendingDelete(null)
	}

	const cancelDelete = () => setPendingDelete(null)

	const togglePinHandler = async (id: string) => {
		await togglePin(id)
	}

	const startEdit = (note: AdminNote) => {
		setEditingId(note.id)
		setEditContent(note.content)
	}

	const saveEdit = async () => {
		if (!editingId) return
		await edit(editingId, { content: editContent.trim() })
		setEditingId(null)
		setEditContent('')
	}

	const chip = PALETTE[activeTab]
	const theme = CARD_THEME[activeTab]
	const tapeColor = chip.strong

	const preview = (t: string, len = 80) =>
		t.length > len ? t.slice(0, len).trim() + '…' : t || '— kliknij ołówek, aby edytować —'

	return (
		<UniversalAdminCard className='flex flex-col overflow-hidden pb-4'>
			{/* NAV */}
			<div className='grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2 mb-4 items-center'>
				{TABS.map(tab => {
					const Icon = tab.icon
					const isActive = activeTab === tab.id
					const pal = PALETTE[tab.id]
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={[
								'rounded-xl border transition-all px-4 text-sm font-heebo_medium flex items-center justify-center gap-2 tracking-wide',
								TAB_H,
								'hover:bg-black/5',
							].join(' ')}
							style={{
								backgroundColor: isActive ? pal.light : '#FFFFFF',
								color: pal.strong,
								borderColor: isActive ? pal.strong : '#E5EAF2',
								boxShadow: isActive ? '0 1px 0 rgba(0,0,0,0.02)' : 'none',
							}}
							title={tab.label}>
							<Icon className='w-4 h-4' />
							<span className='truncate'>{tab.label}</span>
						</button>
					)
				})}

				{/* + Dodaj – dyskretny */}
				<button
					type='button'
					onClick={addEmptyNote}
					className={[
						'rounded-xl text-sm font-heebo_medium flex items-center justify-center',
						'transition-colors cursor-pointer',
						TAB_H,
						'aspect-square',
						'text-middle-blue/60 hover:text-middle-blue',
						'hover:bg-middle-blue/10 active:bg-middle-blue/15',
						'focus:outline-none focus:ring-0 focus-visible:ring-0',
					].join(' ')}
					title='Dodaj notatkę'
					aria-label='Dodaj notatkę'>
					<Plus className='w-5 h-5' />
				</button>
			</div>

			{/* LISTA */}
			<div className='flex-1 pr-1'>
				<div className='relative'>
					{filteredNotes.length > 0 ? (
						<>
							<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch transition-opacity duration-300'>
								{filteredNotes.map(note => (
									<div key={note.id} className='relative h-full'>
										{/* kartka */}
										<div
											className='relative h-full p-8 pt-12 pb-20 overflow-hidden font-heebo_regular border border-middle-blue/10 rounded-[12px]'
											style={{
												backgroundColor: theme.paperBg,
												color: theme.text,
												clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${CORNER}px), calc(100% - ${CORNER}px) 100%, 0 100%)`,
											}}>
											{/* taśma */}
											<div
												className='absolute top-3 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full'
												style={{ backgroundColor: tapeColor, opacity: 0.75 }}
											/>

											{/* Akcje */}
											<div className='absolute top-4 right-4 flex gap-2 p-1'>
												<button onClick={() => startEdit(note)} title='Edytuj' className='p-1 rounded'>
													<Edit3
														className='w-4 h-4 opacity-50 hover:opacity-100 transition-opacity'
														style={{ color: theme.icon }}
													/>
												</button>
												<button
													onClick={() => togglePinHandler(note.id)}
													title={note.pinned ? 'Odepnij' : 'Przypnij'}
													className='p-1 rounded'>
													<Pin
														className={`w-4 h-4 transition-opacity ${
															note.pinned ? 'opacity-100' : 'opacity-50 hover:opacity-100'
														}`}
														style={{ color: theme.icon }}
													/>
												</button>
												<button onClick={() => askDeleteNote(note)} title='Usuń' className='p-1 rounded'>
													<Trash2
														className='w-4 h-4 opacity-50 hover:opacity-100 transition-opacity'
														style={{ color: theme.icon }}
													/>
												</button>
											</div>

											{/* Treść / Edycja */}
											{editingId === note.id ? (
												<div className='mt-2'>
													<textarea
														ref={taRef}
														value={editContent}
														onChange={e => setEditContent(e.target.value)}
														onInput={autosize}
														onKeyDown={e => e.key === 'Enter' && e.ctrlKey && saveEdit()}
														className='w-full outline-none focus:ring-0 font-heebo_regular tracking-wider p-6 border overflow-hidden resize-y placeholder:text-middle-blue/40'
														rows={10}
														style={{
															minHeight: '240px',
															height: 'auto',
															color: theme.text,
															borderColor: PALETTE[activeTab].lightBorder,
														}}
														placeholder='Twoja notatka…'
													/>
													<div className='flex items-center justify-between mt-3 pb-4'>
														<button
															onClick={() => {
																setEditingId(null)
																setEditContent('')
															}}
															className='px-3 py-1.5 font-heebo_regular rounded text-sm opacity-80 hover:opacity-100'
															style={{ color: theme.text }}>
															Anuluj
														</button>
														<button
															onClick={saveEdit}
															className='px-4 py-2 font-heebo_regular bg-middle-blue text-white rounded-xl text-sm hover:opacity-90'>
															Zapisz
														</button>
													</div>
												</div>
											) : (
												<div className='mt-2 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]'>
													{note.content || '— kliknij ołówek, aby edytować —'}
												</div>
											)}
										</div>

										{/* zagięty róg */}
										<div
											className='pointer-events-none absolute'
											style={{ width: CORNER, height: CORNER, right: 0, bottom: 0 }}>
											<div
												className='absolute inset-0'
												style={{ backgroundColor: theme.cornerBg, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
											/>
										</div>
									</div>
								))}
							</div>

							{/* Overlay ładowania */}
							{loading && (
								<div className='pointer-events-none absolute inset-0 flex items-start justify-center'>
									<div className='mt-4 rounded-full px-3 py-1 text-xs opacity-55 bg-white'>Odświeżam…</div>
								</div>
							)}
						</>
					) : (
						// Szkielet przy pierwszym wejściu
						<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'>
							{[...Array(3)].map((_, i) => (
								<div key={i} className='h-[260px] rounded-[12px] border border-middle-blue/10 bg-white animate-pulse' />
							))}
						</div>
					)}
				</div>
			</div>

			{/* Potwierdzenie usunięcia */}
			<ConfirmModal
				open={!!pendingDelete}
				title='Usunąć notatkę?'
				description={pendingDelete ? `“${preview(pendingDelete.content)}”` : ''}
				confirmText='Usuń'
				cancelText='Anuluj'
				onConfirm={confirmDelete}
				onCancel={cancelDelete}
			/>
		</UniversalAdminCard>
	)
}
