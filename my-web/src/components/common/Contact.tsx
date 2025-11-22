'use client'

import dynamic from 'next/dynamic'
const LottiePlayer = dynamic(() => import('../Lottie/LottiePlayer'), { ssr: false })

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useState, useMemo } from 'react'

import Attach from '../../../public/icons/attachPEF.json'
import mailSendPEF from '../../../public/icons/mailSendPEF.json'

import Buttons from '../ui/Buttons'
import Icons from './Icons'
import ToCopy from './ToCopy'
import { getAllCountries } from '@/utils/country/countryHelper'
import CustomSelect from '../ui/CustomSelect'

declare global {
	interface Window {
		gtag?: (...args: any[]) => void
		dataLayer?: any[]
	}
}

export default function Contact() {
	const [files, setFiles] = useState<File[]>([])
	const [showConfirmation, setShowConfirmation] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const [email, setEmail] = useState('')
	const [country, setCountry] = useState<string>('') // ISO-2
	const [message, setMessage] = useState('')

	const [errors, setErrors] = useState<{ email?: string; message?: string }>({})
	const errorText = 'p-red px-2 mb-5'

	const countryOptions = useMemo(() => {
		return getAllCountries('en')
	}, [])

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files ? Array.from(e.target.files) : []
		if (!selected.length) return
		setFiles(prev => [...prev, ...selected])
	}, [])

	const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault()
		setIsDragging(false)
		if (e.dataTransfer?.files?.length) {
			setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
		}
	}, [])

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()

			// POPRAWKA 10/10:
			// Strażnik zapobiegający podwójnemu wysłaniu.
			// Działa niezależnie od propów komponentu <Buttons.ContactBtn>.
			if (isLoading) return

			const nextErrors: { email?: string; message?: string } = {}

			if (!email.trim()) nextErrors.email = 'Email is required'
			else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Invalid email format'
			if (!message.trim()) nextErrors.message = 'Message cannot be empty'

			if (Object.keys(nextErrors).length) {
				setErrors(nextErrors)
				return
			}

			setErrors({})
			setIsLoading(true)

			const formData = new FormData()
			formData.append('email', email)
			formData.append('country', country || 'Country not specified')
			formData.append('message', message)
			files.forEach(file => formData.append('files[]', file))

			try {
				await fetch('https://polandexportflow.com/send-email.php', { method: 'POST', body: formData })

				setEmail('')
				setCountry('')
				setMessage('')
				setFiles([])
				setShowConfirmation(true)

				window.dataLayer = window.dataLayer || []
				window.dataLayer.push({ event: 'form_submission_success' })
			} catch (err) {
				console.error('Error sending email:', err)
				setErrors({ message: 'Failed to send message. Please try again.' })
			} finally {
				setIsLoading(false)
			}
		},
		[email, message, country, files, isLoading] // Dodano isLoading do zależności hooka
	)

	return (
		<section id='contact' className='section bg-light-blue'>
			<div className='flex flex-col lg:flex-row wrapper w-full'>
				{/* FORM */}
				<div className='w-full lg:w-1/2 mb-8 lg:mb-0'>
					<h2>Send Us a Message</h2>

					<form className='space-y-2 text-dark-blue' onSubmit={handleSubmit} noValidate>
						{/* EMAIL */}
						<input
							type='email'
							placeholder='Your Email Address'
							value={email}
							onChange={e => setEmail(e.target.value)}
							className='px-4 md:px-6 py-4 md:py-6'
							aria-invalid={Boolean(errors.email)}
							aria-describedby={errors.email ? 'err-email' : undefined}
							autoComplete='email'
							required
						/>
						{errors.email && (
							<p id='err-email' className={errorText}>
								{errors.email}
							</p>
						)}

						{/* COUNTRY */}
						<CustomSelect
							value={country}
							onChange={setCountry}
							placeholder='Destination Country'
							options={countryOptions}
							showFlags
						/>

						{/* MESSAGE */}
						<textarea
							placeholder='Write Your Message'
							className='px-4 md:px-6 py-4 md:py-6 h-32 mb-1'
							value={message}
							onChange={e => setMessage(e.target.value)}
							aria-invalid={Boolean(errors.message)}
							aria-describedby={errors.message ? 'err-message' : undefined}
							required
						/>
						{errors.message && (
							<p id='err-message' className={errorText}>
								{errors.message}
							</p>
						)}

						{/* DROPZONE */}
						<label
							className={`flex flex-col justify-center w-full text-[12px] md:text-[14px]
              text-middle-blue font-heebo_regular p-4 md:p-6 items-center cursor-pointer
              border mb-3 rounded-md transition-all duration-200
              ${
								isDragging
									? 'border-dashed border-green bg-green/30'
									: `bg-white ${
											files.length > 0
												? 'border-middle-blue hover:border-middle-blue/80'
												: 'border-middle-blue/20 hover:border-middle-blue/80'
									  }`
							}`}
							onDragEnter={e => {
								e.preventDefault()
								setIsDragging(true)
							}}
							onDragOver={e => {
								e.preventDefault()
								setIsDragging(true)
							}}
							onDragLeave={() => setIsDragging(false)}
							onDrop={handleDrop}>
							<input type='file' className='hidden' onChange={handleFileChange} multiple />
							<div className='flex items-center gap-2 select-none'>
								<span className='text-dark-blue/50'>Attach files (optional) — Drag & Drop or Click</span>
								<div className='w-6 h-6'>
									<LottiePlayer animationData={Attach} interval={11000} />
								</div>
							</div>

							{/* FILE LIST */}
							{files.length > 0 && (
								<ul className='mt-5 w-full'>
									{files.map((file, index) => (
										<li
											key={`${file.name}-${index}`}
											className='flex justify-between items-center px-4 py-3 text-sm text-middle-blue border-b border-light-blue last:border-b-0'>
											<span className='truncate max-w-[85%]'>{file.name}</span>
											<button
												type='button'
												className='ml-3 text-red hover:text-dark-blue transition'
												onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
												aria-label={`Remove file ${file.name}`}>
												✕
											</button>
										</li>
									))}
								</ul>
							)}
						</label>

						{/* CTA + SOCIALS */}
						<div className='flex flex-col-reverse xl:flex-row justify-between items-start w-full space-y-4 xl:space-y-0'>
							<div className='flex items-center space-x-2 mt-4 xl:mt-0'>
								<p className='mr-4'>or contact via:</p>
								<Link
									href='https://m.me/polandexportflow'
									aria-label='Contact via Messenger'
									className='flex justify-center items-center h-[48px] lg:h-[60px] w-[48px] lg:w-[60px] bg-white border border-middle-blue/20 rounded-md hover:border-[rgba(0,153,255,1)] hover:bg-[rgba(0,153,255,0.1)] transition duration-300'>
									<Icons.messengerIcon className='w-5 h-5 lg:w-6 lg:h-6 text-middle-blue' />
								</Link>
								<Link
									href='https://wa.me/48784317005'
									aria-label='Contact via WhatsApp'
									className='flex justify-center items-center h-[48px] lg:h-[60px] w-[48px] lg:w-[60px] bg-white border border-middle-blue/20 rounded-md hover:border-[rgba(37,211,102,1)] hover:bg-[rgba(37,211,102,0.1)] transition duration-300'>
									<Icons.whatsappIcon className='w-5 h-5 lg:w-6 lg:h-6 text-middle-blue' />
								</Link>
							</div>

							{/* POPRAWKA 10/10: Usunięto błędny prop 'disabled' */}
							<Buttons.ContactBtn />
						</div>

						{/* STATIC CONTACTS */}
						<div className='mt-5 flex flex-col md:flex-row md:items-start md:gap-14 bg-middle-blue/4 p-5 rounded-md'>
							<div className='mb-3 md:mb-0'>
								<span className='block text-[11px] md:text-[12px] text-middle-blue/60 mb-1'>E-mail</span>
								<ToCopy
									text='contact@polandexportflow.com'
									label='contact@polandexportflow.com'
									className='text-[13px] md:text-[16px] font-heebo_medium text-middle-blue'
								/>
							</div>

							<div>
								<span className='block text-[11px] md:text-[12px] text-middle-blue/60 mb-1'>WhatsApp</span>
								<ToCopy
									text='+48 784 317 005'
									label='+48 784 317 005'
									className='text-[13px] md:text-[16px] font-heebo_medium text-middle-blue'
								/>
							</div>
						</div>
					</form>
				</div>

				{/* ILLUSTRATION */}
				<div className='flex lg:w-1/2 justify-center overflow-hidden'>
					<Image
						src='/img/worldPackage.svg'
						alt='Logistics Illustration'
						width={500}
						height={500}
						style={{ maxHeight: '500px' }}
						className='rounded-lg object-cover'
					/>
				</div>
			</div>

			{/* CONFIRM MODAL */}
			{showConfirmation && (
				<div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-dark-blue/60 bg-opacity-50 z-50'>
					<div className='bg-red p-8 lg:p-10 mx-2 text-center rounded-lg relative -top-40'>
						<button
							className='absolute top-2 right-2 mt-2 mr-2'
							onClick={() => setShowConfirmation(false)}
							aria-label='Close confirmation'>
							<Icons.CloseIcon className='w-7 h-7 text-white' />
						</button>
						<div className='w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center mx-auto'>
							<LottiePlayer animationData={mailSendPEF} interval={3000} />
						</div>
						<h3 className='h3-white m-3'>Message Delivered!</h3>
						<p className='p-white'>
							Your message has been shipped faster than Polish pierogi to a hungry customer!
							<br />
							<br />
							We'll be in touch shortly {':)'}
						</p>
					</div>
				</div>
			)}
		</section>
	)
}
