import DocsPageLayout, { DocSection } from '@/components/layout/DocsPageLayout'
import React from 'react'

// === POPRAWKA TYPU TABLICY ===
const privacySections: DocSection[] = [
	{
		id: 'introduction',
		title: '1. \u2002 Introduction',
		content: (
			<p>
				At <b>PolandExportFlow</b>, we respect your privacy and are committed to protecting your personal data. This
				Privacy Policy explains how we collect, use, and store your information when you use our services.
			</p>
		),
	},
	{
		id: 'data-we-collect',
		title: '2. \u2002 Data We Collect',
		content: (
			<>
				<p>PolandExportFlow offers the following services:</p>
				<ul className='list-disc list-inside ml-4'>
					<li>
						<b>Personal details:</b> Name, email address, phone number.
					</li>
					<li>
						<b>Shipping and billing information:</b> Delivery address, recipient details.
					</li>
					<li>
						<b>Payment details:</b> Processed securely via third-party providers (we do not store payment data).
					</li>
					<li>
						<b>Communication history:</b> Emails, chat messages, or social media interactions.
					</li>
					<li>
						<b>Technical data:</b> IP address, browser type, cookies, and analytics data.
					</li>
				</ul>
			</>
		),
	},
	{
		id: 'how-we-use-data',
		title: '3. \u2002 How We Use Your Data',
		content: (
			<>
				<p>We collect and process your data for the following purposes:</p>
				<ul className='list-disc list-inside ml-4'>
					<li>To process and fulfill your orders.</li>
					<li>To communicate with you about your order status.</li>
					<li>To provide customer support.</li>
					<li>To improve our website and services.</li>
					<li>To comply with legal obligations.</li>
				</ul>
				<p>
					We <b>do not sell or share</b> your personal data with third parties for marketing purposes.
				</p>
			</>
		),
	},
	{
		id: 'data-sharing',
		title: '4. \u2002 Data Sharing & Third Parties',
		content: (
			<>
				<p>
					To provide our services, we <b>must share certain personal data</b> with:
				</p>
				<ul className='list-disc list-inside ml-4'>
					<li>
						<b>Logistics providers and shipping carriers</b> (e.g., DHL, FedEx, UPS) to ensure package delivery.
					</li>
					<li>
						<b>Payment processors</b> (Wise, Revolut, Zen, Stripe) to handle secure transactions.
					</li>
					<li>
						<b>Legal authorities</b> if required for fraud prevention or tax compliance.
					</li>
				</ul>
				<p>
					All shared data is used <b>only for fulfilling orders</b> and meeting legal obligations.
				</p>
			</>
		),
	},
	{
		id: 'payment-processing',
		title: '5. \u2002 Payment Processing',
		content: (
			<p>
				All transactions are processed through <b>Wise, Revolut, Zen, and Stripe</b>. PolandExportFlow{' '}
				<b>does not store</b> payment details.
			</p>
		),
	},
	{
		id: 'cookies',
		title: '6. \u2002 Cookies & Tracking Technologies',
		content: (
			<>
				<p>We use cookies and tracking technologies to enhance user experience:</p>
				<ul className='list-disc list-inside ml-4'>
					<li>
						<b>Essential cookies:</b> Required for website functionality.
					</li>
					<li>
						<b>Analytics cookies:</b> Help us understand how visitors use our site.
					</li>
					<li>
						<b>Functional cookies:</b> Remember user preferences (e.g., language settings).
					</li>
				</ul>
				<p>You can manage cookie preferences in your browser settings.</p>
			</>
		),
	},
	{
		id: 'data-security',
		title: '7. \u2002 Data Security & Storage',
		content: (
			<>
				<p>
					We implement security measures to protect your data from unauthorized access, modification, or disclosure.
				</p>
			</>
		),
	},
	{
		id: 'your-rights',
		title: '8. \u2002 Your Rights',
		content: (
			<>
				<ul className='list-disc list-inside ml-4'>
					<li>
						<b>Access</b> your personal data.
					</li>
					<li>
						<b>Request corrections</b> if your data is inaccurate.
					</li>
					<li>
						<b>Request deletion</b> of your data (where legally applicable).
					</li>
					<li>
						<b>Object to processing</b> in certain cases.
					</li>
					<li>
						<b>Withdraw consent</b> for non-essential data collection (e.g., cookies).
					</li>
				</ul>
				<p>
					To exercise your rights, contact us at <b>contact@polandexportflow.com</b>.
				</p>
			</>
		),
	},
	{
		id: 'data-retention',
		title: '9. \u2002 Data Retention',
		content: (
			<>
				<p>We retain personal data only as long as necessary to:</p>
				<ul className='list-disc list-inside ml-4'>
					<li>Fulfill orders and provide support.</li>
					<li>Comply with tax and legal regulations.</li>
					<li>Resolve potential disputes.</li>
				</ul>
			</>
		),
	},
	{
		id: 'third-party-links',
		title: '10. \u2002 Third-Party Links',
		content: <p>Our website may contain links to external sites. We are not responsible for their privacy policies.</p>,
	},
	{
		id: 'updates',
		title: '11. \u2002 Updates to This Policy',
		content: (
			<p>
				We may update this Privacy Policy when necessary. The latest version will always be available on our website.
			</p>
		),
	},
	{
		id: 'contact',
		title: '12. \u2002 Contact Us',
		content: (
			<>
				<p>If you have any questions, contact us at:</p>
				<p>
					<b>contact@polandexportflow.com</b>
				</p>
			</>
		),
	},
]

export default function PrivacyPolicy() {
	return <DocsPageLayout pageTitle='Privacy Policy & Cookies' sections={privacySections} />
}
