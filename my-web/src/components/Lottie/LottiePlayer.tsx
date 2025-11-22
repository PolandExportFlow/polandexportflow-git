'use client'

import { useEffect, useRef } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'

interface LottiePlayerProps {
	animationData: any 
	interval?: number
}

const LottiePlayer: React.FC<LottiePlayerProps> = ({ animationData, interval = 5000 }) => {
	const lottieRef = useRef<LottieRefCurrentProps | null>(null)

	useEffect(() => {
		const timer = setInterval(() => {
			if (lottieRef.current) {
				lottieRef.current.goToAndPlay(0, true)
			}
		}, interval)

		return () => clearInterval(timer)
	}, [interval])

	return <Lottie lottieRef={lottieRef} animationData={animationData} loop={false} />
}

export default LottiePlayer
