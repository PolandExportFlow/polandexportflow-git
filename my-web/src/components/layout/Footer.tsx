import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import Icons from '../common/Icons'
import ToCopy from '../common/ToCopy'
import Logo from '../common/Logo'

const Footer = () => {
	const year = new Date().getFullYear()

	return (
		<footer className='flex flex-col items-center w-full bg-light-blue border-t border-middle-blue/10'>
			{/* GÓRNA CZĘŚĆ */}
			<div className='wrapper w-full px-3 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-14'>
				{/* LEWA KOLUMNA: BRAND + SOCIAL + KONTAKT */}
				<div className='space-y-4'>
					<Logo />
					<p className='max-w-[360px]'>
						We act as an intermediary, sourcing and exporting products from Poland to customers worldwide. From single
						purchases to bulk orders, we ensure a smooth and secure transaction.
					</p>

					{/* SOCIAL */}
					<div className='flex items-center flex-wrap gap-3 my-6 lg:my-8'>
						<Link href='https://wa.me/48784317005' className='footerIcon' aria-label='WhatsApp' title='WhatsApp'>
							<Icons.whatsappIcon className='w-4 h-4 lg:w-5 lg:h-5 text-middle-blue' />
						</Link>
						<Link href='https://m.me/polandexportflow' className='footerIcon' aria-label='Messenger' title='Messenger'>
							<Icons.messengerIcon className='w-4 h-4 lg:w-5 lg:h-5 text-middle-blue' />
						</Link>
						<Link
							href='https://www.instagram.com/poland.export.flow'
							className='footerIcon'
							aria-label='Instagram'
							title='Instagram'>
							<Icons.igIcon className='w-4 h-4 lg:w-5 lg:h-5 text-middle-blue' />
						</Link>
						<Link
							href='https://www.tiktok.com/@polandexportflow.com'
							className='footerIcon'
							aria-label='TikTok'
							title='TikTok'>
							<Icons.tikTokIcon className='w-4 h-4 lg:w-5 lg:h-5 text-middle-blue' />
						</Link>
						<Link
							href='https://www.youtube.com/@polandexportflow'
							className='footerIcon'
							aria-label='YouTube'
							title='YouTube'>
							<Icons.ytIcon className='w-4 h-4 lg:w-6 lg:h-6 text-middle-blue' />
						</Link>
						<Link
							href='https://www.facebook.com/polandexportflow/'
							className='footerIcon'
							aria-label='Facebook'
							title='Facebook'>
							<Icons.fbIcon className='w-4 h-4 lg:w-5 lg:h-5 text-middle-blue' />
						</Link>
					</div>

					{/* KONTAKT */}
					<div className='text-[13px] md:text-[14px] text-middle-blue bg-middle-blue/4 p-5 rounded-md'>
						<div className='flex items-center space-x-3 mb-4'>
							<Mail className='w-4 h-4' />
							<ToCopy text='contact@polandexportflow.com' label='contact@polandexportflow.com' />
						</div>
						<div className='flex items-center space-x-3'>
							<Phone className='w-4 h-4' />
							<ToCopy text='+48 784 317 005' label='+48 784 317 005' />
						</div>
					</div>
				</div>

				{/* PRAWA CZĘŚĆ: 3 KOLUMNY LINKÓW */}
				<div className='col-span-2 lg:ml-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-2'>
					{/* SERVICES */}
					<nav aria-label='Services'>
						<h3>Services</h3>
						<ul className='mt-4'>
							<li>
								<Link href='/pricing#serviceTable'>Parcel Forwarding</Link>
							</li>
							<li>
								<Link href='/pricing#serviceTable'>Assisted Purchase</Link>
							</li>
							<li>
								<Link href='/pricing#serviceTable'>International Shipping</Link>
							</li>
							<li>
								<Link href='/pricing#serviceTable'>B2B Product Sourcing</Link>
							</li>
							<li>
								<Link href='/pricing#serviceTable'>Domestic Pickup</Link>
							</li>
							<li>
								<Link href='/business-clients'>For Business Clients</Link>
							</li>
							<li>
								<Link href='/vinted-sellers'>For Vinted Sellers</Link>
							</li>
							<li>
								<Link href='/partner-program'>Partner Program</Link>
							</li>
						</ul>
					</nav>

					{/* HELP CENTER */}
					<nav aria-label='Help Center'>
						<h3>Help Center</h3>
						<ul className='mt-4'>
							<li>
								<Link href='/how-it-works'>How It Works</Link>
							</li>
							<li>
								<Link href='/pricing'>Pricing</Link>
							</li>
							<li>
								<Link href='/faq'>FAQ</Link>
							</li>
							<li>
								<Link href='/prohibited-items'>Prohibited Items</Link>
							</li>
							<li>
								<Link href='/customs-and-country-rules'>Customs & Country Rules</Link>
							</li>
							<li>
								<Link href='/tracking'>Tracking</Link>
							</li>
							<li>
								<Link href='/#contact'>Contact</Link>
							</li>
						</ul>
					</nav>

					{/* BUSINESS & PROGRAMS */}
					<nav aria-label='Legal'>
						<h3>Legal</h3>
						<ul className='mt-4'>
							<li>
								<Link href='/privacy-policy'>Privacy Policy & Cookies</Link>
							</li>
							<li>
								<Link href='/terms-and-conditions'>Terms & Conditions</Link>
							</li>
							<li>
								<Link href='/shipping-coverage'>Shipping Coverage</Link>
							</li>
							<li>
								<Link href='/couriers'>Couriers</Link>
							</li>
							<li>
								<Link href='/insurance'>Insurance</Link>
							</li>
							<li>
								<Link href='/payments'>Payments</Link>
							</li>
							<li>
								<Link href='/sitemap.xml' target='_blank' rel='noopener noreferrer'>
									Sitemap
								</Link>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			{/* DÓŁ STOPKI */}
			<div className='w-full border-t border-middle-blue/10 bg-middle-blue/6 mt-8 px-3 lg:px-8 xl:px-12 flex flex-col lg:flex-row justify-between items-center py-4 lg:py-6 font-heebo_regular text-middle-blue text-[12px] gap-2'>
				<span className='text-center lg:text-left'>{year} © Copyright PolandExportFlow. All Rights Reserved</span>
				<a
					className='text-center lg:text-right hover:text-light-red transition duration-240 cursor-pointer hidden lg:flex'
					href='https://www.behance.net/sovagedesign'
					target='_blank'
					rel='noopener noreferrer'>
					Developed by: Sovage Company
				</a>
			</div>
		</footer>
	)
}

export default Footer
