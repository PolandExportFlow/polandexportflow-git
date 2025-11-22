'use client'

import React, { useState } from 'react'
import { User, MapPin, Lock, PackagePlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { useSettings } from './useSettings'

type BtnState = 'idle' | 'loading' | 'success' | 'error'

export default function SettingsPage() {
	const {
		loading,
		error,
		userRow,
		form,
		setForm,
		saveDefaults,
		isAddressDirty, // Odebrano flagę
		pwdA,
		pwdB,
		setPwdA,
		setPwdB,
		changePassword,
		pwdErrors,
		isPasswordDirty, // Odebrano flagę
	} = useSettings()

	const [defaultsBtn, setDefaultsBtn] = useState<BtnState>('idle')
	const [pwdBtn, setPwdBtn] = useState<BtnState>('idle')
	const [defaultsMsg, setDefaultsMsg] = useState<string | null>(null)
	const [pwdMsg, setPwdMsg] = useState<string | null>(null)

	const flash = (
		setter: React.Dispatch<React.SetStateAction<BtnState>>,
		msgSetter: (m: string | null) => void,
		ok: boolean,
		msg?: string
	) => {
		setter(ok ? 'success' : 'error')
		if (msg) msgSetter(msg)
		setTimeout(
			() => {
				setter('idle')
				msgSetter(null)
			},
			ok ? 1800 : 3500
		)
	}

	const handleSaveDefaults = async () => {
		if (loading || defaultsBtn === 'loading' || !isAddressDirty) return
		setDefaultsBtn('loading')
		setDefaultsMsg(null)
		const res = await saveDefaults()
		flash(setDefaultsBtn, setDefaultsMsg, res.success, res.message)
	}

	const handleChangePwd = async () => {
		if (loading || pwdBtn === 'loading' || !isPasswordDirty) return
		setPwdBtn('loading')
		setPwdMsg(null)
		const res = await changePassword()
		flash(setPwdBtn, setPwdMsg, res.success, res.message)
	}

	return (
		<section className='section mt-[80px] lg:mt-[130px] bg-light-blue overflow-x-hidden min-h-screen'>
			<div className='wrapper w-full max-w-full mx-auto relative'>
				<main className='flex flex-col gap-3 md:gap-4 min-w-0'>
					{/* === ACCOUNT INFO === */}
					<UniversalDetail
						title='Account Information'
						icon={<User className='h-5 w-5 text-middle-blue' />}
						className='border-light-blue bg-white text-middle-blue'
						collapsible
						defaultOpen
						defaultOpenMobile={false}>
						<div className='p-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]'>
							<Row label='Customer Code' value={userRow?.user_code ?? '—'} />
							<Row label='Account type' value={userRow?.account_type ?? '—'} />
							<Row label='Email' value={userRow?.email ?? '—'} />
							<Row label='Verified' value={userRow?.is_verified ? 'Yes' : 'No'} />
						</div>
					</UniversalDetail>

					{/* === DEFAULT SHIPPING === */}
					<UniversalDetail
						title='Default Shipping Address'
						icon={<MapPin className='h-5 w-5 text-middle-blue' />}
						className='border-light-blue bg-white text-middle-blue'
						collapsible
						defaultOpen
						defaultOpenMobile={false}>
						<div className='p-2'>
							<div className='p-4 text-[14px] text-middle-blue/75 bg-middle-blue/3 w-full border border-middle-blue/20 rounded-md mb-5'>
								These details will auto-fill when you click “Use defaults” in new orders.
							</div>

							<div className='bg-ds-light-blue rounded-md p-6 md:p-10 flex flex-col gap-6'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									{/* ⭐️ POPRAWKA: Używamy 'default_full_name' i 'default_phone' */}
									<Input
										label='Full name'
										value={form.default_full_name}
										onChange={v => setForm(s => ({ ...s, default_full_name: v }))}
									/>
									<Input
										label='Phone'
										value={form.default_phone}
										onChange={v => setForm(s => ({ ...s, default_phone: v }))}
									/>
								</div>

								{/* ⭐️ DODANO: Pole 'default_email' */}
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<Input
										label='Email (for delivery)'
										value={form.default_email}
										onChange={v => setForm(s => ({ ...s, default_email: v }))}
										placeholder='(optional)'
									/>
									<Input
										label='Country'
										value={form.default_country}
										onChange={v => setForm(s => ({ ...s, default_country: v }))}
									/>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<Input
										label='City'
										value={form.default_city}
										onChange={v => setForm(s => ({ ...s, default_city: v }))}
									/>
									<Input
										label='Postal code'
										value={form.default_postal}
										onChange={v => setForm(s => ({ ...s, default_postal: v }))}
									/>
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									{/* ⭐️ POPRAWKA: Zmieniono 'md:grid-cols-3' na 'md:grid-cols-2' dla lepszego dopasowania */}
									<Input
										label='Street'
										value={form.default_street}
										onChange={v => setForm(s => ({ ...s, default_street: v }))}
									/>
									<Input
										label='Apartment'
										value={form.default_apartment}
										onChange={v => setForm(s => ({ ...s, default_apartment: v }))}
										placeholder='(optional)'
									/>
								</div>
							</div>

							<div className='flex flex-col md:flex-row md:items-center md:justify-end gap-2 md:gap-3 mt-5'>
								{defaultsMsg ? <InlineNote ok={defaultsBtn === 'success'} text={defaultsMsg} /> : null}
								<PrimaryButton
									label='Save Default Address'
									loadingLabel='Saving…'
									successLabel='Saved'
									errorLabel='Error'
									state={defaultsBtn}
									onClick={handleSaveDefaults}
									icon={<PackagePlus className='h-4.5 w-4.5' />}
									disabled={loading || !isAddressDirty}
								/>
							</div>
						</div>
					</UniversalDetail>

					{/* === CHANGE PASSWORD === */}
					<UniversalDetail
						title='Change Password'
						icon={<Lock className='h-5 w-5 text-middle-blue' />}
						className='border-light-blue bg-white text-middle-blue'
						collapsible
						defaultOpen
						defaultOpenMobile={false}>
						<div className='p-2'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6 bg-ds-light-blue rounded-md p-6 md:p-10'>
								<Input label='New password' type='password' value={pwdA} onChange={setPwdA} error={pwdErrors.pwdA} />
								<Input
									label='Repeat new password'
									type='password'
									value={pwdB}
									onChange={setPwdB}
									error={pwdErrors.pwdB}
								/>
							</div>

							<div className='flex flex-col md:flex-row md:items-center md:justify-end gap-2 md:gap-3 mt-5'>
								{pwdMsg ? <InlineNote ok={pwdBtn === 'success'} text={pwdMsg} /> : null}
								<PrimaryButton
									label='Change Password'
									loadingLabel='Updating…'
									successLabel='Updated'
									errorLabel='Error'
									state={pwdBtn}
									onClick={handleChangePwd}
									icon={<Lock className='h-4.5 w-4.5' />}
									disabled={loading || !isPasswordDirty}
								/>
							</div>

							{error && (
								<p className='p-red mt-3' aria-live='polite'>
									{error}
								</p>
							)}
						</div>
					</UniversalDetail>
				</main>
			</div>
		</section>
	)
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex flex-col p-5 md:p-6 bg-ds-light-blue rounded-md'>
			<span className='text-[11px] md:text-[12px] text-middle-blue/60 mb-1.5'>{label}</span>
			<span className='text-[12px] md:text-[14px] font-heebo_medium tracking-wide text-middle-blue'>{value}</span>
		</div>
	)
}

function Input({
	label,
	value,
	onChange,
	type = 'text',
	placeholder,
	error,
}: {
	label: string
	value?: string | null
	onChange: (v: string) => void
	type?: string
	placeholder?: string
	error?: string
}) {
	const id = label.replace(/\s+/g, '-').toLowerCase()
	return (
		<div className='flex flex-col'>
			<label htmlFor={id} className='text-[12px] text-middle-blue/60 mb-1'>
				{label}
			</label>
			<input
				id={id}
				type={type}
				value={value ?? ''}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				className={`border rounded-md px-5 py-4 text-[13px] text-middle-blue outline-none placeholder:text-[12px]
${error ? 'border-red/70 focus:border-red' : 'border-middle-blue/40 focus:border-middle-blue'}`}
				aria-invalid={Boolean(error)}
				aria-describedby={error ? `${id}-error` : undefined}
			/>
			{error ? (
				<p id={`${id}-error`} className='p-red mt-1'>
					{error}
				</p>
			) : null}
		</div>
	)
}

function InlineNote({ ok, text }: { ok: boolean; text: string }) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 text-[12px] md:text-[13px] px-2.5 py-1.5 rounded-md
${ok ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}
			aria-live='polite'>
			{ok ? <CheckCircle2 className='w-4 h-4' /> : <AlertCircle className='w-4 h-4' />}
			{text}
		</span>
	)
}

function PrimaryButton({
	label,
	loadingLabel = 'Loading…',
	successLabel = 'Done',
	errorLabel = 'Error',
	state,
	onClick,
	icon,
	disabled,
}: {
	label: string
	loadingLabel?: string
	successLabel?: string
	errorLabel?: string
	state: BtnState
	icon?: React.ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	const content = {
		idle: (
			<>
				{icon}
				<span>{label}</span>
			</>
		),
		loading: (
			<>
				<Loader2 className='w-4 h-4 animate-spin' />
				<span>{loadingLabel}</span>
			</>
		),
		success: (
			<>
				<CheckCircle2 className='w-4 h-4' />
				<span>{successLabel}</span>
			</>
		),
		error: (
			<>
				<AlertCircle className='w-4 h-4' />
				<span>{errorLabel}</span>
			</>
		),
	}[state]

	const base =
		state === 'error'
			? 'bg-red border-red/25 hover:bg-red'
			: state === 'success'
			? 'bg-green border-green/25 hover:bg-green'
			: disabled && state === 'idle'
			? 'bg-middle-blue border-middle-blue/25'
			: 'bg-green border-green/25 hover:bg-green/75'

	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled || state === 'loading'}
			className={`inline-flex items-center justify-center gap-2 rounded-md border py-4 md:py-5 text-[12px] px-7 md:text-[13px] w-full md:w-auto
transition font-made_light tracking-wide text-white ${base} disabled:opacity-50`}
			aria-live='polite'>
			{content}
		</button>
	)
}
