'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import CustomSelect, { type SelectOption } from './CustomSelect'

type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea' | 'select'
type OptionLike = string | SelectOption

interface UniversalInputProps {
	label: string
	name?: string
	value: string | number | undefined | null
	onChange: (value: string, name?: string) => void
	placeholder?: string
	type?: InputType
	required?: boolean
	disabled?: boolean
	options?: OptionLike[]
	leftIcon?: LucideIcon
	rightIcon?: LucideIcon
	onRightIconClick?: () => void
	error?: string
	helpText?: string
	autoComplete?: string
	suffix?: string
	icon?: React.ReactNode
	showLogos?: boolean
	className?: string
	inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
	step?: number | string
	bare?: boolean
	min?: number | string
	max?: number | string
	pattern?: string
	onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
	onBlurCapture?: React.FocusEventHandler<HTMLInputElement>
}

export default function UniversalInput({
	label,
	name,
	value,
	onChange,
	placeholder,
	type = 'text',
	required = false,
	disabled = false,
	options = [],
	leftIcon: LeftIcon,
	rightIcon: RightIcon,
	onRightIconClick,
	error,
	helpText,
	autoComplete,
	suffix,
	icon,
	showLogos,
	className,
	inputMode,
	step,
	bare = false,
	min,
	max,
	pattern,
	onBlur,
	onBlurCapture,
}: UniversalInputProps) {
	const describedBy = error ? `${name}-error` : helpText ? `${name}-help` : undefined

	const Label = bare ? null : (
		<label htmlFor={name} className='block mb-2 ml-0.5 font-medium text-dark-blue'>
			{icon ? (
				<span className='mr-2 inline-flex items-center'>{icon}</span>
			) : LeftIcon ? (
				<LeftIcon className='h-3 w-3 lg:h-4 lg:w-4 mr-2 text-middle-blue inline' />
			) : null}
			{label}
			{required && <span className='text-red ml-1'>*</span>}
			{helpText && (
				<span id={describedBy} className='ml-2 inline-flex items-center text-[12px] text-middle-blue/80'>
					{helpText}
				</span>
			)}
		</label>
	)

	const ErrorLine = error ? (
		<p id={`${name}-error`} className='p-red mt-2 ml-2 flex items-center gap-2' aria-live='polite' role='alert'>
			<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
				<path
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
					d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
				/>
			</svg>
			<span>{error}</span>
		</p>
	) : null

	const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		onBlur?.(e)
		if (onBlurCapture && e.currentTarget instanceof HTMLInputElement) {
			onBlurCapture(e as React.FocusEvent<HTMLInputElement>)
		}
	}

	if (type === 'select' && !bare) {
		const normalizedOptions: SelectOption[] = (options || []).map(o =>
			typeof o === 'string' ? { value: o, label: o } : o
		)

		return (
			<div className='w-full mt-4 '>
				{Label}
				<CustomSelect
					name={name}
					required={required}
					value={value as string}
					onChange={val => onChange(val, name)}
					placeholder={placeholder}
					disabled={disabled}
					options={normalizedOptions}
					error={error}
					showFlags={showLogos}
				/>
				{ErrorLine}
			</div>
		)
	}

	if (type === 'textarea') {
		const area = (
			<textarea
				id={name}
				name={name}
				value={value ?? ''}
				onChange={e => onChange(e.target.value, name)}
				onBlur={handleBlur}
				placeholder={placeholder}
				required={required}
				disabled={disabled}
				rows={3}
				aria-invalid={!!error}
				aria-describedby={describedBy}
				className={[
					'p-4 md:p-6 resize-y min-h-[48px] md:min-h-[56px]',
					error ? 'border-red' : '',
					className ?? '',
				].join(' ')}
			/>
		)
		if (bare) return area
		return (
			<div className='w-full mt-4'>
				{Label}
				{area}
				{ErrorLine}
			</div>
		)
	}

	if (type === 'number' && suffix) {
		const numberWithSuffix = (
			<div className='relative'>
				<input
					id={name}
					name={name}
					type='number'
					value={value ?? ''}
					onChange={e => onChange(e.target.value, name)}
					onBlur={handleBlur}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					autoComplete={autoComplete}
					inputMode={inputMode}
					step={step ?? '0.01'}
					min={min}
					max={max}
					pattern={pattern}
					aria-invalid={!!error}
					aria-describedby={describedBy}
					className={[
						'p-4 md:p-6 text-left',
						'appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
						error ? 'border-red' : '',
						className ?? '',
					].join(' ')}
				/>
				<div className='absolute inset-y-0 right-5 md:right-6 flex items-center pointer-events-none'>
					<span className='text-middle-blue text-[12px] md:text-[14px] whitespace-nowrap'>{suffix}</span>
				</div>
			</div>
		)
		if (bare) return numberWithSuffix
		return (
			<div className='w-full mt-4'>
				{Label}
				{numberWithSuffix}
				{ErrorLine}
			</div>
		)
	}

	const standardInput = (
		<div className='relative'>
			<input
				id={name}
				name={name}
				type={type}
				value={value ?? ''}
				onChange={e => onChange(e.target.value, name)}
				onBlur={handleBlur}
				placeholder={placeholder}
				required={required}
				disabled={disabled}
				autoComplete={autoComplete}
				inputMode={inputMode}
				step={type === 'number' ? step : undefined}
				min={type === 'number' ? min : undefined}
				max={type === 'number' ? max : undefined}
				pattern={pattern}
				aria-invalid={!!error}
				aria-describedby={describedBy}
				className={[
					'p-4 md:p-6',
					RightIcon ? 'pr-10' : '',
					type === 'number'
						? 'appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
						: '',
					error ? 'border-red' : '',
					className ?? '',
				].join(' ')}
			/>
			{RightIcon && !bare && (
				<div className='absolute inset-y-0 right-0 pr-6 flex items-center'>
					<button
						type='button'
						onClick={onRightIconClick}
						className='text-middle-blue opacity-50 hover:opacity-100 focus:outline-none transition-opacity duration-300'
						tabIndex={-1}
						aria-label='action'>
						<RightIcon className='h-4 w-4' />
					</button>
				</div>
			)}
		</div>
	)

	if (bare) return standardInput

	return (
		<div className='w-full mt-4'>
			{Label}
			{standardInput}
			{ErrorLine}
		</div>
	)
}
