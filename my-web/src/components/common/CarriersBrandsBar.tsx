const BrandsBar = () => {
	return (
		<div className='bg-white py-6 md:py-9 flex justify-center items-center px-4'>
			<div className='grid grid-cols-3 gap-x-4 gap-y-10 lg:flex lg:gap-10 wrapper  w-full justify-center items-center text-center'>
				<img src='/img/carriers/upsPEF.svg' alt='UPS' className='h-9 lg:h-10 max-w-[100px] w-auto mx-auto' />
				<img src='/img/carriers/dhlPEF.svg' alt='DHL' className='h-6 lg:h-10 max-w-[100px] w-auto mx-auto' />
				<img src='/img/carriers/FedExPEF.svg' alt='FedEx' className='h-8 lg:h-10 max-w-[100px] w-auto mx-auto' />
				<img src='/img/carriers/glsPEF.svg' alt='GLS' className='h-8 lg:h-9 max-w-[100px] w-auto mx-auto' />
				<img src='/img/carriers/InPostPEF.svg' alt='InPost' className='h-8 lg:h-10 max-w-[100px] w-auto mx-auto' />

				<img
					src='/img/carriers/pocztaPolskaPEF.svg'
					alt='Poczta Polska'
					className='hidden lg:block h-6 lg:h-10 max-w-[100px] lg:max-w-[140px] w-auto mx-auto'
				/>
				<img src='/img/carriers/dpdPEF.svg' alt='DPD' className='h-7 lg:h-9 max-w-[100px] w-auto mx-auto' />
			</div>
		</div>
	)
}

export default BrandsBar
