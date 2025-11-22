import Icons from './Icons'

const servicesData = [
	{ name: 'Transparent Pricing', poland: 'No hidden costs', other: 'Unexpected fees' },
	{
		name: 'Flexible Shipping Options',
		poland: 'Various carriers & express shipping',
		other: 'Limited carrier options',
	},
	{ name: 'Real-Time Order Tracking', poland: 'Detailed tracking updates', other: 'Basic or delayed tracking' },
	{ name: 'Worldwide Delivery', poland: 'Fast, reliable global shipping', other: 'Limited destinations' },
	{ name: 'Consolidation', poland: 'Free, saves on shipping costs', other: 'Paid (hidden fees)' },
	{ name: 'Package Splitting & Merging', poland: 'Free service upon request', other: 'Extra charge or unavailable' },
	{ name: 'Photo & Video Inspection', poland: 'Free high-quality images/videos', other: 'Paid or unavailable' },
	{ name: 'Free Storage', poland: '30 Days', other: 'No option' },
	{
		name: 'Assisted Purchase',
		poland: 'Low commission (3%) or free for regular customers',
		other: 'High commission (5% or more)',
	},
	{ name: 'Bulk Order Discounts', poland: 'Available for regular customers', other: 'No discounts for bulk shipments' },
	{ name: 'Test Run', poland: 'Free', other: 'Paid service' },
]

const ServicesTable = () => {
	return (
		<section id='serviceTable' className='flex justify-center pb-4 md:pb-14 px-3 w-full bg-light-blue'>
			<div className='wrapper w-full overflow-x-auto'>
				<h2>Our Advantages</h2>
				<table className='w-full border-collapse bg-white text-middle-blue min-w-[300px] sm:min-w-full'>
					<thead>
						<tr className='grid grid-cols-3 border-b-2 md:border-b-3 border-light-blue '>
							<th className='pricingTh p-4 py-5 md:p-7 md:py-9'>Services</th>
							<th className='pricingTh p-4 py-5 md:p-7 md:py-9 border-x-2 md:border-x-3 border-light-blue'>
								<span className='block sm:hidden'>PEF</span>
								<span className='hidden sm:block'>PolandExportFlow</span>
							</th>
							<th className='pricingTh p-4 py-5 md:p-7 md:py-9'>Other</th>
						</tr>
					</thead>
					<tbody>
						{servicesData.map((service, index) => (
							<tr
								key={index}
								className='grid grid-cols-3 border-b-2 md:border-b-3  border-light-blue last:border-none'
								style={{ lineHeight: '1.6' }}>
								<td className='pricingTd'>{service.name}</td>
								<td className='flex flex-row sm:gap-3 items-center border-x-2 md:border-x-3 border-light-blue blueTd pricingTd'>
									<Icons.tickIcon className='hidden md:block w-4 h-4' />
									<span>{service.poland}</span>
								</td>
								<td className='flex items-center gap-3 text-red/60 pricingTd'>
									<Icons.crossIcon className='hidden md:block w-4 h-4' />
									<span>{service.other}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}

export default ServicesTable
