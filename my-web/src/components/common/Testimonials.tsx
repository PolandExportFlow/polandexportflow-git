'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import Flag from '@/components/common/Flag'

// ZOPTYMALIZOWANY KOD IKON SVG (Brak żądań HTTP)

// Twój SVG gwiazdki
const StarIcon = ({ className = 'w-4 h-4' }) => (
	<svg
		className={className}
		xmlns='http://www.w3.org/2000/svg'
		width='14.761'
		height='13.71'
		viewBox='0 0 14.761 13.71'
		fill='currentColor'
		aria-hidden>
		<path
			id='star'
			d='M46.761,53.142H41.114L39.381,47.9l-1.733,5.242H32l4.619,3.226-1.8,5.242,4.56-3.249,4.56,3.249-1.8-5.242Z'
			transform='translate(-32 -47.9)'
			fill='#FFBF00' // Używamy Twojego koloru z pliku
		/>
	</svg>
)

// Twoje SVG logo Google
const GoogleLogoSVG = () => (
	<svg className='w-6 h-6' viewBox='0 0 48 48' aria-hidden>
		<path
			fill='#fbc02d'
			d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
		/>
		<path
			fill='#e53935'
			d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
		/>
		<path
			fill='#4caf50'
			d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'
		/>
		<path
			fill='#1565c0'
			d='M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'
		/>
	</svg>
)

const ReviewBadge = () => (
	<div
		className='
      w-full flex items-center justify-between
      rounded-md border border-[#d7e3ff] bg-[#f6f9ff]
      p-4 px-5
    '
		aria-label='Google review 5 out of 5'>
		{/* Google logo (TERAZ Z TWOIM SVG) */}
		<div className='flex items-center gap-3'>
			<GoogleLogoSVG />
			<div className='flex flex-col leading-tight'>
				<span className='text-dark-blue text-[11px]'>Posted on</span>
				<span className='text-dark-blue font-heebo_medium text-sm'>Google</span>
			</div>
		</div>

		{/* Gwiazdki po prawej (TERAZ TWÓJ WBUDOWANY SVG) */}
		<div className='inline-flex items-center gap-1'>
			{Array.from({ length: 5 }).map((_, i) => (
				<StarIcon key={i} className='w-4 h-4 select-none pointer-events-none' />
			))}
		</div>
	</div>
)

const testimonials = [
	{
		name: 'Dillon Burns',
		country: 'United States',
		iso: 'US',
		rating: 5,
		content:
			"If you're looking for a way to ship something from Poland to somewhere else, I would definitely go with these guys. Very responsive, respectful, and considerate people..",
	},
	{
		name: 'Karoline Magnussen',
		country: 'Australia',
		iso: 'AU',
		rating: 5,
		content:
			'Amazing freight forwarding service! Konrad was so helpful, replied promptly, gave great information, and was super reliable. Highly recommend for future deliveries.',
	},
	{
		name: 'Mala P.',
		country: 'South Africa',
		iso: 'ZA',
		rating: 5,
		content:
			'I was truly amazed at how smoothly my transaction went. Konrad was ever so helpful. I entrusted them to even conduct my purchase on my behalf. Will definitely be using again..',
	},
	{
		name: 'Darren McHugh',
		country: 'Ireland',
		iso: 'IE',
		rating: 5,
		content:
			'Excellent service consolidating Parkside tools I ordered from Lidl.pl and shipping to Ireland. The team, especially Konrad, was incredibly supportive and informative throughout.',
	},
	{
		name: 'Kostas Sn',
		country: 'Greece',
		iso: 'GR',
		rating: 5,
		content: 'The best experience I had, related to parcel forwarding!',
	},
	{
		name: 'Kaleigh Moore',
		country: 'United States',
		iso: 'US',
		rating: 5,
		content:
			'Found a book on a Polish site that didn’t ship to the US. I got quotes, chose an option, Konrad purchased on my behalf, sent photos, and it arrived in perfect condition in under a week.',
	},
	{
		name: 'Iván Márton',
		country: 'Hungary',
		iso: 'HU',
		rating: 5,
		content:
			"Great service, delivering to Hungary. The communication was excellent, I've received updates about each steps, I was led through the whole process..",
	},
]

// --- Nowy komponent obliczeniowy do izolacji logiki ---
const useSliderMetrics = (containerWidth: number, slidesToShow: number) => {
	// —— Stałe układu ——
	const GAP = 8
	const LEFT_MOBILE = 0
	const RIGHT_MOBILE = 16

	const padH = slidesToShow === 1 ? LEFT_MOBILE + RIGHT_MOBILE : 0
	const contentW = Math.max(0, containerWidth - padH)

	const cardW = slidesToShow === 1 ? contentW : contentW / Math.max(1, slidesToShow)
	const step = cardW + GAP
	const maxIndex = Math.max(0, testimonials.length - slidesToShow)

	return useMemo(
		() => ({
			GAP,
			LEFT_MOBILE,
			RIGHT_MOBILE,
			contentW,
			cardW,
			step,
			maxIndex,
			isMobile: slidesToShow === 1,
		}),
		[containerWidth, slidesToShow]
	)
}

export default function TestimonialsSlider() {
	const [index, setIndex] = useState(0)
	const [slidesToShow, setSlidesToShow] = useState(2)
	const containerRef = useRef<HTMLDivElement | null>(null) 
	const [containerWidth, setContainerWidth] = useState(0)
	const x = useMotionValue(0)
	const stopAnimRef = useRef<(() => void) | null>(null)

	const updateWidth = useCallback(() => {
		const w = window.innerWidth
		setSlidesToShow(w >= 1200 ? 4 : w >= 900 ? 3 : w >= 640 ? 2 : 1)
		if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth)
	}, [])

	useEffect(() => {
		requestAnimationFrame(updateWidth)

		const handleResize = () => requestAnimationFrame(updateWidth)
		window.addEventListener('resize', handleResize)
		window.addEventListener('orientationchange', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
			window.removeEventListener('orientationchange', handleResize)
		}
	}, [updateWidth])

	const { GAP, LEFT_MOBILE, RIGHT_MOBILE, contentW, cardW, step, maxIndex, isMobile } = useSliderMetrics(
		containerWidth,
		slidesToShow
	)

	useEffect(() => {
		setIndex(prev => Math.min(Math.max(0, prev), maxIndex))
	}, [maxIndex])

	const clampIndex = useCallback((i: number) => Math.min(Math.max(0, i), maxIndex), [maxIndex])

	const goTo = useCallback(
		(i: number, instant = false) => {
			const clamped = clampIndex(i)
			setIndex(clamped)

			const trackContent = testimonials.length * cardW + (testimonials.length - 1) * GAP
			const maxX = Math.max(0, trackContent - contentW)
			const target = -Math.min(clamped * step, maxX)

			stopAnimRef.current?.()
			if (instant) {
				x.set(target)
				return
			}

			const controls = animate(
				x,
				target,
				isMobile
					? { type: 'tween', duration: 0.22, ease: 'easeOut' }
					: { type: 'spring', stiffness: 420, damping: 44, mass: 0.8 }
			)
			stopAnimRef.current = () => controls.stop()
		},
		[clampIndex, cardW, contentW, step, isMobile, x, GAP]
	)

	const next = () => goTo(index + 1)
	const prev = () => goTo(index - 1)

	const onDragEnd = useCallback(
		(_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
			const velocityFactor = 0.25
			const projected = index + -(info.offset.x + info.velocity.x * velocityFactor) / step
			let target = Math.round(projected)
			target = Math.min(Math.max(0, target), maxIndex)
			goTo(target)
		},
		[index, step, maxIndex, goTo]
	)

	useEffect(() => {
		goTo(index, true)
	}, [contentW, step, goTo])

	const dragConstraints = useMemo(() => {
		const trackContent = testimonials.length * cardW + (testimonials.length - 1) * GAP
		const leftConstraint = -Math.max(0, trackContent - contentW)
		return { left: leftConstraint, right: 0 }
	}, [cardW, contentW, GAP])

	return (
		<section className='section bg-dark-blue'>
			<div className='wrapper w-full text-light-blue'>
				<div className='flex flex-row justify-between items-start mb-2'>
					<h2 className='h2-white'>What Customers Say About Us?</h2>

					{/* Strzałki (desktop) */}
					<div className='hidden md:flex gap-3'>
						<button
							onClick={prev}
							disabled={index === 0}
							className={`p-2 flex items-center justify-center transition-all duration-300 ${
								index === 0 ? 'text-dark-blue cursor-not-allowed' : 'text-white hover:text-light-blue'
							}`}>
							<svg className='w-5 h-5 md:w-6 md:h-6 rotate-180' viewBox='0 0 32 32' fill='currentColor' aria-hidden>
								<path d='M28.66,17.11a1.19,1.19,0,0,0,.09-.15l.1-.2.06-.2a.84.84,0,0,0,.05-.17,2,2,0,0,0,0-.78.84.84,0,0,0-.05-.17l-.06-.2-.1-.2a1.19,1.19,0,0,0-.09-.15,1.79,1.79,0,0,0-.25-.31l-10-10a2,2,0,0,0-2.82,2.82L22.17,14H5a2,2,0,0,0,0,4H22.17l-6.58,6.59a2,2,0,1,0,2.82,2.82l10-10A1.79,1.79,0,0,0,28.66,17.11Z' />
							</svg>
						</button>
						<button
							onClick={next}
							disabled={index >= maxIndex}
							className={`p-2 flex items-center justify-center transition-all duration-300 ${
								index >= maxIndex ? 'text-dark-blue cursor-not-allowed' : 'text-white hover:text-light-blue'
							}`}>
							<svg className='w-5 h-5 md:w-6 md:h-6' viewBox='0 0 32 32' fill='currentColor' aria-hidden>
								<path d='M28.66,17.11a1.19,1.19,0,0,0,.09-.15l.1-.2.06-.2a.84.84,0,0,0,.05-.17,2,2,0,0,0,0-.78.84.84,0,0,0-.05-.17l-.06-.2-.1-.2a1.19,1.19,0,0,0-.09-.15,1.79,1.79,0,0,0-.25-.31l-10-10a2,2,0,0,0-2.82,2.82L22.17,14H5a2,2,0,0,0,0,4H22.17l-6.58,6.59a2,2,0,1,0,2.82,2.82l10-10A1.79,1.79,0,0,0,28.66,17.11Z' />
							</svg>
						</button>
					</div>
				</div>

				{/* TRACK */}
				<div
					ref={containerRef}
					className='overflow-hidden w-full cursor-grab active:cursor-grabbing'
					style={{
						paddingLeft: isMobile ? LEFT_MOBILE : 0,
						paddingRight: isMobile ? RIGHT_MOBILE : 0,
						touchAction: 'pan-y pinch-zoom',
						WebkitOverflowScrolling: 'touch' as any,
					}}>
					<motion.div
						drag='x'
						style={{ x, willChange: 'transform', gap: GAP }}
						dragConstraints={dragConstraints}
						dragElastic={isMobile ? 0.12 : 0.08}
						dragMomentum={isMobile}
						dragTransition={isMobile ? { power: 0.5, timeConstant: 260 } : undefined}
						onDragEnd={onDragEnd}
						className='flex'>
						{testimonials.map((t, i) => (
							<motion.div
								key={i}
								className='flex-shrink-0 h-[368px] lg:h-[400px] bg-white rounded-lg  shadow-lg flex flex-col justify-between'
								style={{ width: cardW }}>
								<div className='p-6 lg:p-8'>
									<h3 className='mb-2'>{t.name}</h3>

									<div className='flex items-center gap-2 mb-4'>
										<Flag iso={t.iso} title={t.country} size={18} />
										<p>{t.country}</p>
									</div>

									<span className='text-middle-blue leading-relaxed text-[13px] lg:text-[14px]'>{t.content}</span>
								</div>

								<div className='p-3'>
									<ReviewBadge />
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>

				{/* Pager */}
				<div className='flex justify-center mt-8 gap-2'>
					{Array.from({ length: Math.max(1, maxIndex + 1) }, (_, i) => (
						<button
							key={i}
							onClick={() => goTo(i)}
							className={`rounded-full transition-all duration-300 ${
								index === i ? 'bg-light-blue w-8 h-2' : 'bg-middle-blue hover:bg-light-blue/70 w-2 h-2'
							}`}
							aria-label={`Go to slide ${i + 1}`}
							aria-selected={index === i}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
