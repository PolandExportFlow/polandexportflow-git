'use client'
import { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import UniversalInput from '../ui/UniwersalInput'
import { useAuth } from '../../utils/supabase/useAuth'
import { validatePassword } from '../../utils/supabase/validators'

interface FormData {
  password: string
  confirmPassword: string
}

// --- czytaj access_token z hasha (typowy reset)
function parseHashTokens() {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
  if (!raw) return null
  const p = new URLSearchParams(raw)
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  const type = p.get('type') // 'recovery'
  if (access_token && refresh_token) return { access_token, refresh_token, type }
  return null
}

export default function ResetPassword() {
  const [formData, setFormData] = useState<FormData>({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null) // null = weryfikuję

  const { authLoading } = useAuth()
  const router = useRouter()
  const qp = useSearchParams()
  const didRun = useRef(false)

  // 1) jeśli sesja pojawi się chwilę później – zaakceptuj ją
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) setTokenValid(true)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2) główny efekt: PRZERÓB link → NA KOŃCU sprawdź usera; dopiero wtedy orzeknij
  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    let cancelled = false
    ;(async () => {
      try {
        setMessage('')
        setTokenValid(null)

        // A) hash (#access_token)
        const hashTokens = parseHashTokens()
        if (hashTokens) {
          const { access_token, refresh_token } = hashTokens
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) console.error('setSession error:', error)
          if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname)
        }

        // B) ?code=
        const code = qp.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.error('exchangeCodeForSession error:', error)
        }

        // C) ?token_hash=&type=recovery
        const token_hash = qp.get('token_hash')
        const typeParam =
          (qp.get('type') as 'recovery' | 'signup' | 'magiclink' | 'invite' | 'email_change' | null) ?? null
        if (token_hash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type: typeParam })
          if (error) console.error('verifyOtp error:', error)
        }

        if (typeof window !== 'undefined' && (hashTokens || code || token_hash)) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch (e) {
        console.error('reset init error:', e)
      } finally {
        if (cancelled) return
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) setTokenValid(true)
          else {
            setTokenValid(false)
            setMessage('Reset link is invalid or expired. Please request a new one.')
          }
        } catch (e) {
          console.error('getUser error:', e)
          setTokenValid(false)
          setMessage('Reset link is invalid or expired. Please request a new one.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return { success: true as const }
    } catch (error: any) {
      return { success: false as const, error: { message: error.message || 'Update failed' } }
    }
  }

  const handleChange = (value: string, name?: string) => {
    if (!name) return
    setFormData(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
    if (message) setMessage('')
  }

  const validateForm = () => {
    const e: Record<string, string> = {}

    if (!formData.password.trim()) e.password = 'Password is required'
    else {
      const pwErr = validatePassword(formData.password)
      if (pwErr) e.password = pwErr.message
    }

    if (!formData.confirmPassword.trim()) e.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setMessage('')
    const result = await updatePassword(formData.password)
    if (result.success) {
      setIsSuccess(true)
      setMessage('Password updated successfully! Redirecting to login...')
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 1500)
    } else {
      if (result.error?.message?.toLowerCase().includes('password')) {
        setErrors({ password: result.error.message })
      } else {
        setMessage(result.error?.message || 'Something went wrong. Please try again.')
      }
    }
  }

  const handleBackToLogin = () => router.push('/login')
  const handleRequestNewLink = () => router.push('/forgot-password')

  if (tokenValid === false) {
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
          <h2>Reset Link Invalid</h2>
          <div className='space-y-6 text-middle-blue'>
            <p className='p-red'>{message}</p>
            <div className='flex justify-between items-center min-h-[48px]'>
              <div className='flex-1 mr-4'>
                <p>
                  Need a new reset link?{' '}
                  <button
                    onClick={handleRequestNewLink}
                    className='text-red hover:text-middle-blue underline transition-all duration-300'>
                    Send a new link
                  </button>
                </p>
              </div>
              <button
                onClick={handleBackToLogin}
                className='flex items-center justify-center gap-3 md:gap-4 px-6 md:px-10 py-3 md:py-4 bg-red rounded-md text-white text-[14px] md:text-[16px] font-made_light shadow-md 
                hover:bg-middle-blue transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out] hover:scale-105 shrink-0'>
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (tokenValid === null) {
    return (
      <section className='section mt-[60px] bg-light-blue min-h-screen'>
        <div className='w-[840px] text-center text-middle-blue'>
          <p>Verifying reset link...</p>
        </div>
      </section>
    )
  }

  return (
    <section className='section mt-[60px] bg-light-blue min-h-screen'>
      <div className='w-[840px]'>
        <p className='mb-6'>
          <button
            onClick={handleBackToLogin}
            className='flex items-center gap-2 text-middle-blue hover:text-red transition-all duration-300'>
            <ArrowLeft className='h-4 w-4 mb-0.5' />
            Back to Login
          </button>
        </p>
        <h2>Set a New Password</h2>
        <form className='space-y-8 text-middle-blue' onSubmit={handleSubmit} noValidate>
          <UniversalInput
            label='New Password'
            name='password'
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder='Enter your new password'
            leftIcon={Lock}
            rightIcon={showPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowPassword(v => !v)}
            required
            autoComplete='new-password'
            disabled={isSuccess}
            error={errors.password}
          />
          <UniversalInput
            label='Confirm New Password'
            name='confirmPassword'
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder='Repeat your new password'
            leftIcon={Lock}
            rightIcon={showConfirmPassword ? EyeOff : Eye}
            onRightIconClick={() => setShowConfirmPassword(v => !v)}
            required
            autoComplete='new-password'
            disabled={isSuccess}
            error={errors.confirmPassword}
          />
          {isSuccess && (
            <p className='text-[#22C55E]'>
              <span className='font-heebo_medium'>Password changed!</span> Redirecting to login...
            </p>
          )}
          <div className='flex justify-between items-center min-h-[48px]'>
            <div className='flex-1 mr-4'>{!isSuccess && message && <p className='p-red'>{message}</p>}</div>
            <button
              type='submit'
              disabled={authLoading || isSuccess}
              className='flex items-center justify-center gap-3 md:gap-4 px-6 md:px-10 py-3 md:py-4 bg-red rounded-md text-white text-[14px] md:text-[16px] font-made_light shadow-md 
              hover:bg-middle-blue transition-all duration-300 hover:animate-[exportWave_0.4s_ease-in-out] hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red disabled:hover:scale-100 shrink-0'>
              {authLoading ? 'Updating...' : 'Change Password'}
              <Lock className='w-5 h-5' />
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
