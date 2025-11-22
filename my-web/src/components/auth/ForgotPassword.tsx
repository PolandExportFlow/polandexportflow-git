'use client'
import { useState, useRef, useEffect } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../utils/supabase/useAuth'
import UniversalInput from '../ui/UniwersalInput'

interface FormData {
	email: string
}

// Spójnie z rejestracją
const sanitizeEmail = (raw: string) => (raw || '').trim().toLowerCase().replace(/\.+$/, '')
const isValidEmail = (raw: string) => {
	const email = sanitizeEmail(raw)
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith('.')
}

export default function ForgotPassword() {
	const [formData, setFormData] = useState<FormData>({ email: '' })
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [message, setMessage] = useState('')
	const [isSuccess, setIsSuccess] = useState(false)
	const [countdown, setCountdown] = useState(0)
	const [localSubmitting, setLocalSubmitting] = useState(false)

	const timerRef = useRef<number | null>(null)
	const { resetPassword, authLoading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				window.clearInterval(timerRef.current)
				timerRef.current = null
			}
		}
	}, [])

	const handleChange = (value: string, name?: string) => {
		if (!name) return
		setFormData(prev => ({ ...prev, [name]: value }))
		if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
		if (message) setMessage('')
	}

	const validateForm = () => {
		const e: Record<string, string> = {}
		if (!formData.email.trim()) e.email = 'Email address is required'
		else if (!isValidEmail(formData.email)) e.email = 'Invalid email format'
		setErrors(e)
		return Object.keys(e).length === 0
	}

	const startCountdown = (seconds = 60) => {
		if (timerRef.current !== null) window.clearInterval(timerRef.current)
		setCountdown(seconds)
		const id = window.setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					window.clearInterval(id)
					timerRef.current = null
					return 0
				}
				return prev - 1
			})
		}, 1000)
		timerRef.current = id
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!validateForm()) return
		if (localSubmitting || countdown > 0) return

		setLocalSubmitting(true)
		setMessage('')
		const email = sanitizeEmail(formData.email)

		const result = await resetPassword(email)

		// Uwaga: Supabase różnie zwraca treść błędu, więc patrzymy po fragmencie
		if (result.success) {
			setIsSuccess(true)
			setMessage('Reset link sent! Check your email (including spam folder).')
			startCountdown(60)
		} else {
			const msg = (result.error?.message || '').toLowerCase()

			if (msg.includes('over_email_send_rate_limit')) {
				setMessage('Too many requests. Please try again in 60 seconds.')
				startCountdown(60)
			} else if (msg.includes('email') || msg.includes('user') || msg.includes('not found')) {
				// Jeśli nie chcesz zdradzać, czy email istnieje — zamień na ogólny komunikat:
				// setMessage('If the email exists, you will receive a reset link.')
				setErrors({ email: result.error!.message })
			} else {
				setMessage(result.error?.message || 'Error sending reset link')
			}
		}

		setLocalSubmitting(false)
	}

	const handleBackToLogin = () => router.push('/login')

	const handleResend = async () => {
		if (countdown > 0 || localSubmitting) return
		setLocalSubmitting(true)
		const email = sanitizeEmail(formData.email)
		const result = await resetPassword(email)
		if (result.success) {
			setMessage('Reset link sent again! Check your email.')
			startCountdown(60)
		} else {
			const msg = (result.error?.message || '').toLowerCase()
			if (msg.includes('over_email_send_rate_limit')) {
				setMessage('Too many requests. Please try again in 60 seconds.')
				startCountdown(60)
			} else {
				setMessage(result.error?.message || 'Error sending reset link')
			}
		}
		setLocalSubmitting(false)
	}

	const submitDisabled = authLoading || localSubmitting || isSuccess

	return (
		<section className='section mt-[80px] lg:mt-[130px] bg-light-blue min-h-screen'>
			<div className='w-[840px]'>
				<p className='mb-6'>
					<button
						onClick={handleBackToLogin}
						className='flex items-center gap-2 text-middle-blue hover:text-red transition-all duration-300'>
						<ArrowLeft className='h-4 w-4 mb-0.5' />
						Back to Login
					</button>
				</p>

				<h2>Reset Your Password</h2>

				<form className='space-y-8 text-middle-blue' onSubmit={handleSubmit} noValidate>
					<UniversalInput
						label='Email Address'
						name='email'
						type='email'
						value={formData.email}
						onChange={handleChange}
						placeholder='your.email@example.com'
						leftIcon={Mail}
						required
						autoComplete='email'
						disabled={isSuccess}
						error={errors.email}
					/>

					{isSuccess && (
						<p className='text-[#22C55E]'>
							<span className='font-heebo_medium'>Email sent successfully!</span> Check your inbox (and spam folder).
							The link is valid for 24 hours.
						</p>
					)}

					<div className='flex justify-between items-center min-h-[48px]'>
						<div className='flex-1 mr-4'>
							{!isSuccess && message ? (
								<p className='text-red'>{message}</p>
							) : isSuccess ? (
								<p className='mb-2'>
									Didn’t receive the email?{' '}
									<button
										type='button'
										onClick={handleResend}
										disabled={countdown > 0 || localSubmitting}
										className='text-red hover:text-middle-blue underline transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'>
										{countdown > 0 ? `Try again in ${countdown}s` : 'Send it again'}
									</button>
								</p>
							) : null}
						</div>

						<button
							type='submit'
							disabled={submitDisabled}
							className='flex items-center justify-center gap-3 md:gap-4 px-6 md:px-10 py-3 md:py-4 bg-red rounded-md text-white text-[14px] md:text-[16px] font-made_light shadow-md 
              hover:bg-middle-blue transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out] hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red disabled:hover:scale-100 shrink-0'>
							{authLoading || localSubmitting ? 'Sending...' : 'Send Reset Link'}
							<Mail className='w-5 h-5' />
						</button>
					</div>
				</form>
			</div>
		</section>
	)
}
