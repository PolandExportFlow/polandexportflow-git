'use client'

import React, { useEffect, useMemo, useState } from 'react'
import UniversalAdminCard from '../../utils/UniversalAdminCard'
import Flag from '@/components/common/Flag'

type Zone = { label: string; timezone: string; country: string }
type DayBadge = 'wczoraj' | 'jutro' | null

// Lżejszy wrapper na flagę + responsywne wymiary
const FlagIcon = ({ code, size = 18 }: { code: string; size?: number }) => {
	const props = { code, country: code, countryCode: code, iso: code, size } as any
	return (
		<span className='inline-flex items-center justify-center rounded-full bg-middle-blue/20 border border-middle-blue/30 w-10 h-8 md:w-12 md:h-9 shrink-0'>
			<Flag {...props} />
		</span>
	)
}

// KOLEJNOŚĆ -> 2 kolumny po 4; Sydney pod Mumbai
const DEFAULT_ZONES: Zone[] = [
	{ label: 'Warsaw', timezone: 'Europe/Warsaw', country: 'PL' },
	{ label: 'New York', timezone: 'America/New_York', country: 'US' },
	{ label: 'London', timezone: 'Europe/London', country: 'GB' },
	{ label: 'Dubai', timezone: 'Asia/Dubai', country: 'AE' },

	{ label: 'Mumbai', timezone: 'Asia/Kolkata', country: 'IN' },
	{ label: 'Sydney', timezone: 'Australia/Sydney', country: 'AU' }, // pod Mumbai
	{ label: 'Tokyo', timezone: 'Asia/Tokyo', country: 'JP' },
	{ label: 'Hong Kong', timezone: 'Asia/Hong_Kong', country: 'HK' },
]

// offset w minutach
function getTzOffsetMinutes(tz: string) {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'shortOffset',
			hour12: false,
		}).formatToParts(new Date())
		const raw = parts.find(p => p.type === 'timeZoneName')?.value || ''
		const m = raw.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/)
		if (!m) return null
		const h = parseInt(m[1]!, 10)
		const min = m[2] ? parseInt(m[2], 10) : 0
		return h * 60 + Math.sign(h) * min
	} catch {
		return null
	}
}

// yyyy-mm-dd w danej strefie
function dateKeyInTz(d: Date, tz: string) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(d)
	const y = parts.find(p => p.type === 'year')?.value ?? '0000'
	const m = parts.find(p => p.type === 'month')?.value ?? '00'
	const da = parts.find(p => p.type === 'day')?.value ?? '00'
	return `${y}-${m}-${da}`
}

export default function WorldClockWidget({ zones = DEFAULT_ZONES }: { zones?: Zone[] }) {
	const [now, setNow] = useState(new Date())

	// aktualizacja na starcie minuty
	useEffect(() => {
		let interval: ReturnType<typeof setInterval> | null = null
		const sec = new Date().getSeconds()
		const timeoutMs = (60 - sec) * 1000 + 25
		const t = setTimeout(() => {
			setNow(new Date())
			interval = setInterval(() => setNow(new Date()), 60_000)
		}, timeoutMs)
		return () => {
			clearTimeout(t)
			if (interval) clearInterval(interval)
		}
	}, [])

	const warsawTz = 'Europe/Warsaw'
	const baseOffset = useMemo(() => getTzOffsetMinutes(warsawTz) ?? 0, [now])
	const warsawDateKey = useMemo(() => dateKeyInTz(now, warsawTz), [now])

	type Row = { label: string; country: string; time: string; pretty: string; dayBadge: DayBadge }

	const rows: Row[] = useMemo(() => {
		return zones.slice(0, 8).map((z): Row => {
			const time = new Intl.DateTimeFormat('pl-PL', {
				timeZone: z.timezone,
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			}).format(now)

			const off = getTzOffsetMinutes(z.timezone)
			const diffMin = off == null ? null : off - baseOffset
			const sign = !diffMin ? '' : diffMin > 0 ? '+' : '−'
			const hours = diffMin == null ? '' : Math.trunc(Math.abs(diffMin) / 60)
			const mins = diffMin == null ? '' : Math.abs(diffMin) % 60
			const pretty =
				diffMin == null || diffMin === 0 ? '±0h' : `${sign}${hours}${mins ? ':' + String(mins).padStart(2, '0') : ''}h`

			const dk = dateKeyInTz(now, z.timezone)
			const dayBadge: DayBadge = dk !== warsawDateKey ? (dk < warsawDateKey ? 'wczoraj' : 'jutro') : null

			return { label: z.label, country: z.country, time, pretty, dayBadge }
		})
	}, [zones, now, baseOffset, warsawDateKey])

	const col1 = rows.slice(0, 4)
	const col2 = rows.slice(4, 8)

	const RowView = ({ label, country, time, pretty, dayBadge }: Row) => (
		<div className='flex items-center justify-between h-12 md:h-[56px] px-4 rounded-2xl border border-middle-blue/20 bg-middle-blue/10 hover:bg-middle-blue/15 transition-colors'>
			{/* lewa strona */}
			<div className='flex items-center gap-3 md:gap-4 min-w-0'>
				<FlagIcon code={country} size={16} />
				<div className='flex flex-col min-w-0'>
					<span className='font-medium text-middle-blue text-[13px] md:text-[14px] truncate'>{label}</span>
					<span className='text-[10px] md:text-[11px] text-middle-blue/60 truncate'>od Warszawy: {pretty}</span>
				</div>
			</div>

			{/* prawa strona */}
			<div className='flex items-center gap-1.5 md:gap-2 shrink-0'>
				{dayBadge && (
					<span className='text-[9px] md:text-[10px] px-1.5 py-0.5 rounded bg-white/70 text-middle-blue border border-middle-blue/20'>
						{dayBadge}
					</span>
				)}
				<span className='text-middle-blue text-[14px] md:text-[15px] font-heebo_regular tabular-nums'>{time}</span>
			</div>
		</div>
	)

	return (
		<UniversalAdminCard className='h-full pb-3'>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5'>
				<div className='space-y-2.5 md:space-y-3'>
					{col1.map(r => (
						<RowView key={r.label} {...r} />
					))}
				</div>
				<div className='space-y-2.5 md:space-y-3'>
					{col2.map(r => (
						<RowView key={r.label} {...r} />
					))}
				</div>
			</div>
		</UniversalAdminCard>
	)
}
