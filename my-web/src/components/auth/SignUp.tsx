'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Mail, Lock, Eye, EyeOff, Check, LogIn, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useAuth } from '../../utils/supabase/useAuth'
import { supabase } from '../../utils/supabase/client'
import { sanitizeEmail, isValidEmail, validatePassword } from '../../utils/supabase/validators'

// ⬇️ cięższe komponenty – dynamicznie:
const UniversalInput = dynamic(() => import('../ui/UniwersalInput'), { ssr: false })
const GoogleAuth = dynamic(() => import('./GoogleAuth'), { ssr: false })

interface FormData {
  email: string
  password: string
  confirmPassword: string
}

export default function SignUp() {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState<boolean | null>(null)

  const { signUp, signInWithGoogle, authLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  const handleUniversalChange = (value: any, name?: string) => {
    if (!name) return
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    if (message) setMessage('')
    if (name === 'email') setEmailExists(null)
  }

  const validateForm = () => {
    const e: Record<string, string> = {}
    const email = sanitizeEmail(formData.email)

    if (!email) e.email = 'Email is required'
    else if (!isValidEmail(email)) e.email = 'Invalid email format'

    if (!formData.password) e.password = 'Password is required'
    else {
      const pwErr = validatePassword(formData.password)
      if (pwErr) e.password = pwErr.message
    }

    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'

    if (!agreeToTerms) e.agreeToTerms = 'You must accept the terms'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const checkEmailExists = useCallback(async (raw: string) => {
    const email = sanitizeEmail(raw)
    if (!isValidEmail(email)) return
    try {
      const { data, error } = await supabase.rpc('sys_check_if_user_exists', { p_email: email })
      if (error) {
        setEmailExists(null)
        return
      }
      setEmailExists(Boolean(data))
    } catch {
      setEmailExists(null)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authLoading) return
    if (!validateForm()) return
    setMessage('')

    const email = sanitizeEmail(formData.email)

    try {
      const { data, error } = await supabase.rpc('sys_check_if_user_exists', { p_email: email })
      if (!error && data) {
        setErrors(prev => ({ ...prev, email: 'This email is already registered.' }))
        setEmailExists(true)
        return
      }
    } catch {
      // ignorujemy — signUp i tak zwróci błąd przy duplikacie
    }

    const result = await signUp({ email, password: formData.password })
    if (result.success) {
      setSuccessEmail(email)
      setFormData({ email: '', password: '', confirmPassword: '' })
      setAgreeToTerms(false)
      setErrors({})
      setEmailExists(null)
    } else {
      if (result.error?.field) {
        setErrors({ [result.error.field]: result.error.message })
        if (result.error.field === 'email') setEmailExists(true)
      } else {
        setMessage(result.error?.message || 'An error occurred during registration')
      }
    }
  }

  const handleGoogleSignUp = async () => {
    setMessage('')
    const result = await signInWithGoogle()
    if (!result.success) setMessage(result.error?.message || 'Google sign-in failed')
  }

  return (
    <section className='section mt-[80px] lg:mt-[130px] bg-light-blue min-h-screen'>
      <div className='w-[840px] max-w-full mx-auto'>
        {successEmail ? (
          <div className='min-h-[60vh] flex flex-col items-center justify-center text-center'>
            <div className='mb-5 flex items-center justify-center'>
              <div className='h-28 w-28 rounded-full bg-white shadow-lg ring-4 ring-white/60 flex items-center justify-center'>
                <Mail className='h-9 w-9 text-middle-blue' aria-hidden='true' />
              </div>
            </div>

            <span className='text-[26px] font-made_medium text-middle-blue mb-4 mt-6'>Confirm your email</span>

            <p className='text-middle-blue/90 mb-1'>
              We sent a verification link to <span className='font-heebo_medium'>{successEmail}</span>.
            </p>
            <p className='text-middle-blue/80'>Please check your inbox (and spam folder) to activate your account.</p>

            <div className='mt-14'>
              <button
                className='flex items-center justify-center gap-3 w-64 px-6 py-4 bg-red rounded-md text-white text-[16px] font-made_light shadow-md 
                 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:animate-[exportWave_0.4s_ease-in-out]'
                onClick={() => router.push('/login')}
              >
                Log in
                <LogIn className='w-5 h-5' />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className='text-center mb-8'>
              <h2>Create Your Account</h2>
            </div>

            <form className='text-middle-blue flex flex-col gap-8' onSubmit={handleSubmit} noValidate>
              <UniversalInput
                label='Email Address'
                name='email'
                type='email'
                value={formData.email}
                onChange={handleUniversalChange}
                onBlurCapture={e => checkEmailExists(e.currentTarget.value)}
                placeholder='your.email@example.com'
                leftIcon={Mail}
                autoComplete='email'
                error={errors.email || (emailExists ? 'This email is already registered.' : '')}
                helpText={!errors.email && emailExists === false ? 'Looks good — this email is available.' : undefined}
              />

              <div className='flex flex-col md:flex-row gap-2 md:gap-3'>
                <UniversalInput
                  label='Password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleUniversalChange}
                  placeholder='Your password'
                  leftIcon={Lock}
                  rightIcon={showPassword ? EyeOff : Eye}
                  onRightIconClick={() => setShowPassword(v => !v)}
                  autoComplete='new-password'
                  error={errors.password}
                />

                <UniversalInput
                  label='Confirm Password'
                  name='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleUniversalChange}
                  placeholder='Repeat password'
                  leftIcon={Lock}
                  rightIcon={showConfirmPassword ? EyeOff : Eye}
                  onRightIconClick={() => setShowConfirmPassword(v => !v)}
                  autoComplete='new-password'
                  error={errors.confirmPassword}
                />
              </div>

              <div className='flex flex-col lg:flex-row justify-between gap-6 w-full'>
                <div className='flex flex-col'>
                  <label className='flex items-start gap-3 cursor-pointer text-[12px] lg:text-[15px] text-dark-blue'>
                    <input
                      type='checkbox'
                      checked={agreeToTerms}
                      onChange={e => {
                        setAgreeToTerms(e.target.checked)
                        setErrors(prev => ({ ...prev, agreeToTerms: '' }))
                      }}
                      className='absolute left-[-9999px] opacity-0 w-0 h-0'
                    />
                    <div
                      className={`h-6 w-6 flex items-center justify-center shrink-0 rounded-sm transition-all duration-300 ${
                        agreeToTerms ? 'bg-red' : 'bg-white'
                      }`}
                    >
                      {agreeToTerms && <Check className='w-3 h-3 text-white' strokeWidth={3} />}
                    </div>
                    <span>
                      I agree to the{' '}
                      <a href='/terms' className='text-red hover:text-dark-blue underline transition-all duration-300'>
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href='/privacy' className='text-red hover:text-dark-blue underline transition-all duration-300'>
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  {errors.agreeToTerms && (
                    <p className='p-red mt-2 ml-2 flex items-center space-x-1 text-sm' role='alert' aria-live='polite'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                      <span>{errors.agreeToTerms}</span>
                    </p>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={authLoading}
                  className='flex items-center justify-center gap-3 w-64 px-6 py-4 bg-red rounded-md text-white text-[16px] font-made_light shadow-md 
                   transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:animate-[exportWave_0.4s_ease-in-out]
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                >
                  {authLoading ? 'Creating...' : 'Create Account'}
                  <UserPlus className='w-5 h-5' />
                </button>
              </div>

              {message && (
                <div
                  className={`text-center text-sm ${message.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}
                  aria-live='polite'
                >
                  {message}
                </div>
              )}

              <GoogleAuth onClick={handleGoogleSignUp} isLoading={authLoading} />

              <div className='text-center'>
                <p>
                  Already have an account?{' '}
                  <a href='/login' className='text-red hover:text-middle-blue underline transition-all duration-300'>
                    Sign in here
                  </a>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
