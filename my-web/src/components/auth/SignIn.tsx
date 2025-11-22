'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../utils/supabase/useAuth'
import UniversalInput from '../ui/UniwersalInput'
import GoogleAuth from './GoogleAuth'

interface FormData {
	email: string
	password: string
}

/** helpers */
const sanitizeEmail = (raw: string) => raw.trim().toLowerCase()
const isValidEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(raw))

export default function SignIn() {
	const [formData, setFormData] = useState<FormData>({ email: '', password: '' })
	const [showPassword, setShowPassword] = useState(false)
	const [message, setMessage] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [showForgotPassword, setShowForgotPassword] = useState(false)

	const { signIn, signInWithGoogle, authLoading, isAuthenticated } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (isAuthenticated) router.push('/dashboard')
	}, [isAuthenticated, router])

	const handleUniversalChange = (value: any, name?: string) => {
		if (!name) return
		setFormData(prev => ({ ...prev, [name]: value }))
		setErrors(prev => ({ ...prev, [name]: '' }))
		if (message) setMessage('')
		if (name === 'password' && showForgotPassword) setShowForgotPassword(false)
	}

	const validateForm = () => {
		const e: Record<string, string> = {}
		if (!formData.email.trim()) e.email = 'Email is required'
		else if (!isValidEmail(formData.email)) e.email = 'Invalid email format'
		if (!formData.password.trim()) e.password = 'Password is required'
		setErrors(e)
		return Object.keys(e).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (authLoading) return
		if (!validateForm()) return

		setMessage('')
		const result = await signIn({
			email: sanitizeEmail(formData.email),
			password: formData.password,
		})

		if (!result.success) {
			const txt = (result.error?.message || '').toLowerCase()
			if (
				txt.includes('password') ||
				txt.includes('invalid') ||
				txt.includes('credentials') ||
				txt.includes('incorrect') ||
				txt.includes('wrong')
			) {
				setShowForgotPassword(true)
			}
			setMessage(result.error?.message || 'Invalid email or password')
		}
	}

	const handleGoogleSignIn = async () => {
		setMessage('')
		const result = await signInWithGoogle()
		if (!result.success) setMessage(result.error?.message || 'Error logging in with Google')
	}

	const handleForgotPassword = () => router.push('/forgot-password')

	return (
		<section className='section mt-[80px] lg:mt-[130px] bg-light-blue min-h-screen'>
			<div className='w-[840px] max-w-full mx-auto'>
				<div className='text-center mb-8'>
					<h2>Welcome Back - Log In</h2>
				</div>

				<form className='space-y-8 text-middle-blue' onSubmit={handleSubmit} noValidate>
					<UniversalInput
						label='Email Address'
						name='email'
						type='email'
						value={formData.email}
						onChange={handleUniversalChange}
						placeholder='your.email@example.com'
						leftIcon={Mail}
						required
						autoComplete='email'
						error={errors.email}
						onBlurCapture={e => {
							const v = sanitizeEmail(e.currentTarget.value)
							if (v !== formData.email) setFormData(prev => ({ ...prev, email: v }))
						}}
					/>

					<UniversalInput
						label='Password'
						name='password'
						type={showPassword ? 'text' : 'password'}
						value={formData.password}
						onChange={handleUniversalChange}
						placeholder='Enter your password'
						leftIcon={Lock}
						rightIcon={showPassword ? EyeOff : Eye}
						onRightIconClick={() => setShowPassword(v => !v)}
						required
						autoComplete='current-password'
						error={errors.password}
					/>

					{/* Error + Forgot password */}
					<div className='flex items-center mt-2 flex-wrap gap-y-2'>
						{message && (
							<div className='p-red flex items-center gap-2'>
								<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
									/>
								</svg>
								<p className='p-red text-sm'>{message}</p>
							</div>
						)}

						<button
							type='button'
							onClick={handleForgotPassword}
							className={[
								'ml-auto flex items-center gap-2 text-[12px] lg:text-[14px] font-heebo_regular transition-all duration-300 underline-offset-2',
								showForgotPassword ? 'text-red underline' : 'text-middle-blue hover:text-red hover:underline',
							].join(' ')}>
							<Lock className='w-4 h-4' />
							Forgot your password? Reset it here!
						</button>
					</div>

					{/* Submit */}
					<div className='flex justify-end'>
						<button
							type='submit'
							disabled={authLoading}
							className='flex items-center justify-center gap-3 md:gap-4 px-6 md:px-10 py-3 md:py-4 bg-red rounded-md text-white text-[14px] md:text-[16px] font-made_light shadow-md 
              hover:bg-middle-blue transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out] hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red disabled:hover:scale-100 shrink-0'>
							{authLoading ? (
								'Signing In...'
							) : (
								<>
									Log In
									<LogIn className='w-5 h-5' />
								</>
							)}
						</button>
					</div>

					<GoogleAuth onClick={handleGoogleSignIn} isLoading={authLoading} />

					<div className='text-center'>
						<p>
							Don't have an account?{' '}
							<a
								href='/register'
								className='font-heebo_regular text-red hover:text-middle-blue underline transition-all duration-300'>
								Create one here
							</a>
						</p>
					</div>
				</form>
			</div>
		</section>
	)
}
