'use client'

import Buttons from '../ui/Buttons'

const HeaderButtons = () => {
	return (
		<div className='flex flex-col md:flex-row pt-[106px] md:pt-[180px] items-center justify-center gap-4'>
			<Buttons.GetYourQuote />
			<div className='hidden md:block'>
				<Buttons.HowItWorks />
			</div>
		</div>
	)
}

export default HeaderButtons
