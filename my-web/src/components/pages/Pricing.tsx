import Icons from '../common/Icons'

export default function Pricing() {
	return (
		<section className='section section-top'>
			<div className='wrapper w-full'>
				<h2>Pricing</h2>
				<div className='grid grid-cols-1 md:grid-cols-3 auto-rows-auto gap-2'>
					<div className='flex flex-col justify-between col-span-1 md:col-span-2 row-span-2 whiteCard '>
						<div>
							<h3 className='mb-4'>Our Fee Policy</h3>
						</div>
						<table className='w-full border-collapse bg-white text-middle-blue mt-4 md:mt-6 '>
							<thead>
								<tr className='text-center border-light-blue bg-light-blue'>
									<td className='feeTh p-4 md:p-7 w-1/2'>Order Value</td>
									<td className='feeTh p-4 md:p-7 w-1/2'>Commission Rate</td>
								</tr>
							</thead>
							<tbody className='text-center'>
								<tr className='border-b-2  border-light-blue'>
									<td className='p-4 md:p-7 w-1/2'>Up to $1000</td>
									<td className='p-4 md:p-7 w-1/2'>
										<b>9%</b> (min. $9 per package)
									</td>
								</tr>
								<tr className='border-b-2  border-light-blue bg-gray-50'>
									<td className='p-4 md:p-7 w-1/2'>$1000 – $2500</td>
									<td className='p-4 md:p-7 w-1/2'>
										<b>8%</b>
									</td>
								</tr>
								<tr>
									<td className='p-4 md:p-7 w-1/2'>Above $2500</td>
									<td className='p-4 md:p-7 w-1/2'>
										<b>7%</b>
									</td>
								</tr>
							</tbody>
						</table>
						<p className='mt-6'>
							We charge a commission based on the total order value, including{' '}
							<span className='border-b-1'>product cost</span> and <span className='border-b-1'>shipping fees</span>{' '}
							(courier charges and packaging), ensuring a transparent pricing structure.
						</p>
					</div>
					<div className='whiteCard col-span-1 row-span-1 '>
						<h3 className='mb-4'>Payment Methods</h3>
						<p>PayPal / Revolut / Visa / GooglePay / ApplePay / MC / Blik</p>
						<div className='mt-6 flex flex-row flex-wrap justify-start items-center gap-2'>
							<img
								className='h-[40px] w-auto border md:border-[2px] border-light-blue p-2.5 rounded-md'
								src='/img/paymentMethods/Revolut.svg'
								alt='Revolut'
							/>
							<img
								className='h-[40px] w-auto border md:border-[2px] border-light-blue p-2.5 rounded-md'
								src='/img/paymentMethods/PayPal.svg'
								alt='PayPal'
							/>
							<img className='h-10 w-auto' src='/img/paymentMethods/Visa.svg' alt='Visa' />
							<img className='h-10 w-auto' src='/img/paymentMethods/GooglePay.svg' alt='Google Pay' />
							<img className='h-10 w-auto' src='/img/paymentMethods/ApplePay.svg' alt='Apple Pay' />
							<img className='h-10 w-auto' src='/img/paymentMethods/Mastercard.svg' alt='Mastercard' />
							<img className='h-10 w-auto' src='/img/paymentMethods/Blik.svg' alt='Blik' />
						</div>
					</div>

					<div className='whiteCard col-span-1 row-span-1'>
						<h3 className='mb-4'>Shipping Cost Calculators</h3>
						<ul className='list-disc ml-5'>
							<li>
								<a href='https://www.fedex.com/en-us/online/rating.html#' target='_blank' rel='noopener noreferrer'>
									FedEx
								</a>
							</li>
							<li>
								<a href='https://wwwapps.ups.com/ctc/request?loc=en_PL' target='_blank' rel='noopener noreferrer'>
									UPS
								</a>
							</li>
							<li>
								<a href='https://nadaj.dpd.com.pl/cennik' target='_blank' rel='noopener noreferrer'>
									DPD
								</a>
							</li>
							<li>
								<a href='https://cennik.poczta-polska.pl/' target='_blank' rel='noopener noreferrer'>
									Polish Post
								</a>
							</li>
							<li>
								<a href='https://dhl24.com.pl/en/paczka/packet.html' target='_blank' rel='noopener noreferrer'>
									DHL
								</a>
							</li>
						</ul>
					</div>
					<div className='col-span-1 row-span-1 whiteCard'>
						<h3 className='mb-4'>Shipping Rate Comparison Tools</h3>
						<ul className='list-disc ml-5'>
							<li>
								<a href='https://www.epaka.pl/cennik-kalkulator' target='_blank' rel='noopener noreferrer'>
									Epaka
								</a>
							</li>
							<li>
								<a href='https://furgonetka.pl/?lang=en_GB' target='_blank' rel='noopener noreferrer'>
									Furgonetka
								</a>
							</li>
							<li>
								<a href='https://nowy.allekurier.pl/' target='_blank' rel='noopener noreferrer'>
									AlleKurier
								</a>
							</li>
							<li>
								<a href='https://blpaczka.com/miedzynarodowe' target='_blank' rel='noopener noreferrer'>
									BLpaczka
								</a>
							</li>
						</ul>
					</div>
					<div className='col-span-1 md:col-span-2 row-span-1 whiteCard '>
						<h3 className='mb-6 md:mb-4'>
							<div className='flex flex-row items-center'>
								How We Calculate Our Fees{' '}
								<Icons.calculatorIcon className='w-6 h-6 md:w-8 md:h-8 text-middle-blue ml-2 -rotate-12' />
							</div>
						</h3>
						<div className='space-y-2'>
							<p className='flex justify-between'>
								<span>Product:</span> <span>$400.00</span>
							</p>
							<p className='flex justify-between'>
								<span>Packaging & shipping:</span> <span>$30.00</span>
							</p>
							<p className='flex justify-between'>
								<span>Current shipment value:</span> <span>$430.00</span>
							</p>
							<p className='flex justify-between font-semibold'>
								<span>Our commission (9% of $430.00):</span> <span>$38.70</span>
							</p>
							<p className='flex justify-between'>
								<span>Total shipment value:</span> <span>$468.70</span>
							</p>
							<p className='flex justify-between text-xs text-gray-600'>
								<span>Payment processing fee (PayPal 5.11%):</span> <span>$23.94</span>
							</p>

							<p className='flex justify-between border-t-1 border-middle-blue/10 pt-3 text-lg font-bold text-red mt-3'>
								<span>Total cost:</span> <span>$492.64</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
