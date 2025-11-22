// app/admin/components/sections/messages/ChatProfileInfo.tsx
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
	User as UserIcon,
	Building2,
	ExternalLink,
	Mail,
	Phone,
	MapPin,
	Flag,
	Loader2,
	Save as SaveIcon,
	FileText,
	Notebook,
	UserCheck,
	UserMinus,
	Edit3,
} from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { ContactDetails, ContactOrderSummary } from './msgTypes'

import { fetchChatProfileInfo, fetchChatProfileNote, fetchChatProfileOrders } from './fetchers/profile'

type Props = {
	chatId: string | null
	onOpenOrder?: (orderId: string) => void
}

type Profile = ContactDetails & {
	company_name?: string
	account_type?: 'b2b' | 'b2c'
	address_street?: string
	address_apartment?: string
	address_city?: string
	address_postal?: string
	address_country?: string
	default_street?: string
	default_apartment?: string
	default_city?: string
	default_postal?: string
	default_country?: string
}

/* utils */
const pick = <T,>(...vals: Array<T | undefined>) => vals.find(v => v !== undefined)

const buildAddress = (p?: Profile) => {
	if (!p) return { street: '', cityLine: '', country: '', oneLine: '' }
	const street = pick(p.address_street, p.default_street)
	const apt = pick(p.address_apartment, p.default_apartment)
	const city = pick(p.address_city, p.default_city)
	const postal = pick(p.address_postal, p.default_postal)
	const country = pick(p.address_country, p.default_country)
	const streetLine = [street, apt].filter(Boolean).join(' ')
	const cityLine = [postal, city].filter(Boolean).join(' ')
	const oneLine = p.address || [streetLine, cityLine, country].filter(Boolean).join(', ')
	return { street: streetLine, cityLine, country: country || '', oneLine }
}

async function saveNotes(userId: string, notes: string) {
	const { error } = await supabase.from('users').update({ admin_note: notes }).eq('id', userId)
	if (error) throw error
}

/** helper: z chatId -> contact_id (user_id z tabeli chats) */
async function getContactIdByChatId(chatId: string): Promise<string | null> {
	const { data, error } = await supabase.from('chats').select('user_id').eq('id', chatId).maybeSingle()
	if (error) return null
	return (data as any)?.user_id ?? null
}

export default function ChatProfileInfo({ chatId, onOpenOrder }: Props) {
	const [profile, setProfile] = useState<Profile | undefined>(undefined)

	const [orders, setOrders] = useState<ContactOrderSummary[]>([])
	const [ordersLoading, setOrdersLoading] = useState(false)
	const [ordersError, setOrdersError] = useState<string | null>(null)

	const [notes, setNotes] = useState('')
	const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const [editing, setEditing] = useState(false)
	const [loading, setLoading] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)

	const [profileOpen, setProfileOpen] = useState(false)
	const [orderId, setOrderId] = useState<string | null>(null)

	// assignee (przypisany admin)
	const [ownerId, setOwnerId] = useState<string | null>(null)
	const [ownerName, setOwnerName] = useState<string | null>(null)
	const [ownerLoading, setOwnerLoading] = useState(false)

	// ====== memos ======
	const isB2B = useMemo(
		() => (profile?.account_type || '').toLowerCase() === 'b2b' || !!profile?.company_name,
		[profile?.account_type, profile?.company_name]
	)
	const displayName = useMemo(
		() => profile?.company_name || profile?.full_name || 'Contact',
		[profile?.company_name, profile?.full_name]
	)
	const addr = useMemo(() => buildAddress(profile), [profile])

	const copy = useCallback(async (text?: string) => {
		if (!text) return
		try {
			await navigator.clipboard.writeText(text)
		} catch {}
	}, [])

	const fetchOwner = useCallback(async (cid: string) => {
		setOwnerLoading(true)
		try {
			const contactId = await getContactIdByChatId(cid)
			if (!contactId) {
				setOwnerId(null)
				setOwnerName(null)
				return contactId
			}

			const { data: ca } = await supabase
				.from('contact_assignments')
				.select('owner_id')
				.eq('contact_id', contactId)
				.maybeSingle()

			const oid = (ca as any)?.owner_id ?? null
			setOwnerId(oid)

			if (oid) {
				const { data: u } = await supabase.from('users').select('full_name').eq('id', oid).maybeSingle()
				setOwnerName((u as any)?.full_name ?? oid)
			} else {
				setOwnerName(null)
			}
			return contactId
		} finally {
			setOwnerLoading(false)
		}
	}, [])

	// ====== data load (równolegle) + realtime na assignment ======
	useEffect(() => {
		let alive = true
		let assignmentChannel: ReturnType<typeof supabase.channel> | null = null

		const reset = () => {
			setProfile(undefined)
			setOrders([])
			setNotes('')
			setProfileError(null)
			setOwnerId(null)
			setOwnerName(null)
			setOrdersError(null)
			setEditing(false)
			setSaving('idle')
		}

		if (!chatId) {
			reset()
			return
		}

		setLoading(true)
		setProfileError(null)
		setOrdersLoading(true)
		setOrdersError(null)
		;(async () => {
			try {
				// Fetchuj w jednym rzucie
				const [info, note, ords, contactId] = await Promise.all([
					fetchChatProfileInfo(chatId).catch(() => null),
					fetchChatProfileNote(chatId).catch(() => ''),
					fetchChatProfileOrders(chatId).catch(() => [] as ContactOrderSummary[]),
					getContactIdByChatId(chatId).catch(() => null),
				])
				if (!alive) return

				setProfile((info ?? undefined) as Profile | undefined)
				setNotes(note ?? '')
				setOrders(ords || [])
			} catch {
				if (!alive) return
				setProfile(undefined)
				setProfileError('Failed to load profile.')
			} finally {
				if (alive) setLoading(false)
				if (alive) setOrdersLoading(false)
			}

			// Owner
			const cId = await fetchOwner(chatId)
			if (!alive) return

			// Realtime na assignment tego kontaktu
			if (cId) {
				assignmentChannel = supabase
					.channel(`contact_assignment:${cId}`)
					.on(
						'postgres_changes',
						{ event: '*', schema: 'public', table: 'contact_assignments', filter: `contact_id=eq.${cId}` },
						async payload => {
							// insert/update/delete -> po prostu odśwież ownera
							await fetchOwner(chatId)
						}
					)
					.subscribe()
			}
		})()

		return () => {
			alive = false
			if (assignmentChannel) {
				try {
					supabase.removeChannel(assignmentChannel)
				} catch {}
			}
		}
	}, [chatId, fetchOwner])

	// ====== actions ======
	const claim = useCallback(async () => {
		if (!chatId) return
		const { data: auth } = await supabase.auth.getUser()
		const me = auth?.user?.id
		if (!me) return
		const contactId = await getContactIdByChatId(chatId)
		if (!contactId) return
		const { error } = await supabase
			.from('contact_assignments')
			.upsert(
				{ contact_id: contactId, owner_id: me, assigned_at: new Date().toISOString() },
				{ onConflict: 'contact_id' }
			)
		if (!error) await fetchOwner(chatId)
	}, [chatId, fetchOwner])

	const unassign = useCallback(async () => {
		if (!chatId) return
		const contactId = await getContactIdByChatId(chatId)
		if (!contactId) return
		const { error } = await supabase.from('contact_assignments').delete().eq('contact_id', contactId)
		if (!error) await fetchOwner(chatId)
	}, [chatId, fetchOwner])

	// ====== render ======
	if (!chatId) {
		return <div className='h-full grid place-items-center text-middle-blue/40'>No chat selected</div>
	}

	return (
		<div className='h-full flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden'>
			{/* HEADER */}
			<div className='px-6 py-4 border-b border-middle-blue/10 bg-white flex items-center gap-4'>
				<div className='w-10 h-10 rounded-full grid place-items-center bg-light-blue'>
					{isB2B ? (
						<Building2 className='w-5 h-5 text-middle-blue/80' strokeWidth={1.8} />
					) : (
						<UserIcon className='w-5 h-5 text-middle-blue/80' strokeWidth={1.8} />
					)}
				</div>

				<div className='min-w-0 flex-1'>
					<button
						onClick={() => setProfileOpen(true)}
						className='mt-2 text-left font-heebo_medium text-middle-blue truncate hover:underline'
						title='Open full profile'>
						{loading ? 'Loading…' : displayName}
					</button>

					<div className='mt-1 text-xs font-heebo_regular text-middle-blue/70'>
						{ownerLoading ? (
							<span>Loading assignee…</span>
						) : ownerId ? (
							<span>
								Assigned to: <span className='font-heebo_medium'>{ownerName || ownerId}</span>
							</span>
						) : (
							<span>Unassigned</span>
						)}
					</div>
				</div>
			</div>

			{/* QUICK ACTIONS */}
			<div className='px-6 py-3 border-b border-middle-blue/10 bg-white'>
				<div className='flex items-center gap-2'>
					{!ownerId ? (
						<button
							onClick={claim}
							className='inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-middle-blue text-white hover:bg-middle-blue/90 disabled:opacity-50'
							title='Claim'
							aria-label='Claim'>
							<UserCheck className='w-4 h-4' />
						</button>
					) : (
						<button
							onClick={unassign}
							className='inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-middle-blue border-middle-blue/15 hover:bg-light-blue disabled:opacity-50'
							title='Unassign'
							aria-label='Unassign'>
							<UserMinus className='w-4 h-4' />
						</button>
					)}

					<button
						onClick={() => setProfileOpen(true)}
						className='inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-middle-blue border-middle-blue/15 hover:bg-light-blue disabled:opacity-50'
						title='Open profile'
						aria-label='Open profile'>
						<ExternalLink className='w-4 h-4' />
					</button>

					<button
						onClick={() => copy(profile?.email)}
						disabled={!profile?.email}
						className='inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-middle-blue border-middle-blue/15 hover:bg-light-blue disabled:opacity-50 disabled:cursor-not-allowed'
						title='Copy email'
						aria-label='Copy email'>
						<Mail className='w-4 h-4' />
					</button>

					<button
						onClick={() =>
							copy(
								[
									addr.street ? `Street: ${addr.street}` : '',
									addr.cityLine ? `City/Postal: ${addr.cityLine}` : '',
									addr.country ? `Country: ${addr.country}` : '',
								]
									.filter(Boolean)
									.join('\n') || addr.oneLine
							)
						}
						disabled={!addr.oneLine}
						className='inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-middle-blue border-middle-blue/15 hover:bg-light-blue disabled:opacity-50 disabled:cursor-not-allowed'
						title='Copy address'
						aria-label='Copy address'>
						<MapPin className='w-4 h-4' />
					</button>
				</div>
			</div>

			{/* BODY */}
			<div className='p-6 space-y-8 overflow-auto custom-scroll'>
				{profileError && <div className='text-sm text-red'>⚠ {profileError}</div>}

				{/* Profile information */}
				<section>
					<div className='flex items-center gap-2 text-sm font-heebo_medium text-middle-blue'>
						<UserIcon className='w-4 h-4' />
						<span>Profile information</span>
					</div>
					<div className='h-px bg-middle-blue/10 -mx-6 my-3' />

					{loading ? (
						<div className='text-sm text-middle-blue/60'>Loading…</div>
					) : profile ? (
						<div className='space-y-2 text-middle-blue text-[14px] font-heebo_regular'>
							{profile.email && (
								<div className='flex items-center gap-4 rounded-2xl border border-middle-blue/10 bg-light-blue/40 px-4 py-3'>
									<Mail className='w-4 h-4 text-middle-blue/80' />
									<span>{profile.email}</span>
								</div>
							)}
							{profile.phone && (
								<div className='flex items-center gap-4 rounded-2xl border border-middle-blue/10 bg-light-blue/40 px-4 py-3'>
									<Phone className='w-4 h-4 text-middle-blue/80' />
									<span>{profile.phone}</span>
								</div>
							)}
							{addr.country && (
								<div className='flex items-center gap-4 rounded-2xl border border-middle-blue/10 bg-light-blue/40 px-4 py-3'>
									<Flag className='w-4 h-4 text-middle-blue/80' />
									<span>{addr.country}</span>
								</div>
							)}
							{addr.oneLine && (
								<div className='flex items-center gap-4 rounded-2xl border border-middle-blue/10 bg-light-blue/40 px-4 py-3'>
									<MapPin className='w-4 h-4 text-middle-blue/80' />
									<span>{addr.oneLine}</span>
								</div>
							)}
							{!profile.email && !profile.phone && !addr.oneLine && (
								<div className='text-middle-blue/60'>No contact info.</div>
							)}
						</div>
					) : (
						<div className='text-middle-blue/60'>No contact info.</div>
					)}
				</section>

				{/* Orders */}
				<section>
					<div className='flex items-center gap-2 text-sm font-heebo_medium text-middle-blue'>
						<FileText className='w-4 h-4' />
						<span>Orders</span>
					</div>
					<div className='h-px bg-middle-blue/10 -mx-6 my-3' />

					{ordersLoading ? (
						<div className='text-sm text-middle-blue/60'>Loading…</div>
					) : ordersError ? (
						<div className='text-sm text-red'>⚠ {ordersError}</div>
					) : orders.length === 0 ? (
						<div className='text-sm text-middle-blue/60'>No orders.</div>
					) : (
						<div className='space-y-2 text-middle-blue text-[14px] font-heebo_regular'>
							{orders.map(o => (
								<button
									key={o.id}
									type='button'
									onClick={() => {
										setOrderId(o.id)
										if (onOpenOrder) onOpenOrder(o.id)
									}}
									className='w-full text-left flex items-center gap-4 rounded-2xl border border-middle-blue/10 bg-light-blue/40 px-4 py-3 hover:bg-light-blue transition'
									title={`Open ${o.order_number || o.id}`}
									aria-label={`Open order ${o.order_number || o.id}`}>
									<FileText className='w-4 h-4 text-middle-blue/80 shrink-0' />
									<span className='truncate'>{o.order_number || o.id}</span>
								</button>
							))}
						</div>
					)}
				</section>

				{/* Our notes */}
				<section>
					<div className='flex items-center gap-2 text-sm font-heebo_medium text-middle-blue'>
						<Notebook className='w-4 h-4' />
						<span>Our notes</span>
					</div>
					<div className='h-px bg-middle-blue/10 -mx-6 my-3' />

					<div className='relative' style={{ filter: 'drop-shadow(0 8px 18px rgba(16,42,67,0.12))' }}>
						<div
							className='relative rounded-[20px] pl-6 pr-6 pt-10 pb-6 bg-[#FFF7A6] text-[#5d5300]'
							style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 52px), calc(100% - 52px) 100%, 0 100%)' }}>
							<div className='absolute top-3 left-1/2 -translate-x-1/2 w-24 h-3 bg-[#F2E58F] rounded-full shadow-sm' />
							<button
								onClick={() => {
									if (editing) {
										if (!profile?.id) return
										setSaving('saving')
										saveNotes(profile.id, notes)
											.then(() => {
												setSaving('saved')
												setEditing(false)
												setTimeout(() => setSaving('idle'), 1000)
											})
											.catch(() => {
												setSaving('error')
												setTimeout(() => setSaving('idle'), 1200)
											})
									} else {
										setEditing(true)
									}
								}}
								className='absolute top-4 right-7 text-[#5d5300]/50 hover:text-[#5d5300]/100 transition-colors duration-300'
								title={editing ? 'Save notes' : 'Edit notes'}>
								{editing ? (
									saving === 'saving' ? (
										<Loader2 className='w-4 h-4 animate-spin' />
									) : (
										<SaveIcon className='w-4 h-4' />
									)
								) : (
									<Edit3 className='w-4 h-4' />
								)}
							</button>

							{editing ? (
								<textarea
									value={notes}
									onChange={e => setNotes(e.target.value)}
									placeholder='Private notes about this customer…'
									rows={8}
									className='block w-full min-h-[230px] resize-none rounded-2xl bg-white px-4 py-2 text-[14px] leading-relaxed text-middle-blue'
								/>
							) : (
								<div className='min-h-[230px] whitespace-pre-wrap text-[14px] leading-relaxed tracking-wide'>
									{notes?.trim() || '— no notes —'}
								</div>
							)}
						</div>

						<div className='pointer-events-none absolute right-0 bottom-0' style={{ width: 52, height: 52 }}>
							<div
								className='absolute inset-0'
								style={{ backgroundColor: '#E9DB72', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
							/>
							<div
								className='absolute -left-10 -top-10 w-[160%] h-[160%] rotate-45'
								style={{
									backgroundImage: 'radial-gradient(closest-side, rgba(0,0,0,0.25), rgba(0,0,0,0) 70%)',
									filter: 'blur(10px)',
									opacity: 0.38,
								}}
							/>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
