const StepNumber = ({ number }: { number: number }) => {
	return (
		<div className='hidden md:flex w-1/2 relative  items-center justify-center'>
			<span
				className='font-made_bold text-[120px] text-transparent'
				style={{
					backgroundImage: 'linear-gradient(to top, rgba(227, 236, 248, 1) 24%, rgba(10, 56, 100, .4) 100%)',
					WebkitBackgroundClip: 'text',
					backgroundClip: 'text',
				}}>
				{number}
			</span>
		</div>
	)
}

export default StepNumber
