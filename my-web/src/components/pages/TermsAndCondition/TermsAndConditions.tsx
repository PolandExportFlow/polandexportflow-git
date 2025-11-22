import DocsPageLayout, { DocSection } from '@/components/layout/DocsPageLayout'
import React from 'react'

// === POPRAWKA TYPU TABLICY ===
const termsSections: DocSection[] = [
	{
		id: 'introduction',
		title: '1. \u2002 Introduction',
		content: (
			<p>
				Welcome to <b>PolandExportFlow</b>. These Terms & Conditions govern the services we provide through our online
				platform. By using our services, you agree to these terms.
			</p>
		),
	},
	{
		id: 'services-provided',
		title: '2. \u2002 Services Provided',
		content: (
			<>
				<p>PolandExportFlow offers the following services:</p>
				<ul className='list-disc list-inside ml-4'>
					<li>Purchasing goods from Poland on behalf of clients</li>
					<li>Quality inspection of products before shipment</li>
					<li>Repackaging and forwarding parcels internationally</li>
					<li>Negotiating prices and contracts with suppliers, manufacturers, and wholesalers</li>
					<li>Handling logistics arrangements with shipping providers</li>
					<li>Additional services based on customer requests</li>
				</ul>
			</>
		),
	},
	{
		id: 'payments',
		title: '3. \u2002 Payments',
		content: (
			<>
				<p>All payments must be made in advance before we process any orders.</p>
				<p>
					We accept payments via <b>Wise, Revolut, Zen, and Stripe</b>.
				</p>
				<p>Any additional transaction fees charged by payment providers are the responsibility of the client.</p>
			</>
		),
	},
	{
		id: 'cancellation-refunds',
		title: '4. \u2002 Order Cancellation & Refunds',
		content: (
			<>
				<p>
					Cancellations are possible in urgent situations but must be requested before the order has been processed.
				</p>
				<p>
					All shipments are <b>insured by the carrier</b>, meaning refunds or claims must be handled with the logistics
					provider.
				</p>
			</>
		),
	},
	{
		id: 'shipping-delivery',
		title: '5. \u2002 Shipping & Delivery',
		content: (
			<>
				<p>
					Welcome to PolandExportFlow. These Terms & Conditions govern the services we provide through our online
					platform. By using our services, you agree to these terms.
				</p>
			</>
		),
	},
	{
		id: 'product-liability',
		title: '6. \u2002 Product Issues & Liability',
		content: (
			<>
				<p>
					If a product is defective or does not meet expectations, the claim must be made{' '}
					<b>directly to the original seller</b> from whom we purchased the goods.
				</p>
				<p>
					PolandExportFlow does not manufacture or alter the products and is not responsible for defects or
					product-related complaints.
				</p>
			</>
		),
	},
	{
		id: 'legal-compliance',
		title: '7. \u2002 Compliance with Legal Regulations',
		content: (
			<>
				<p>
					Our services comply with <b>European Union laws</b>, and we operate under international trade regulations.
				</p>
				<p>Clients are responsible for ensuring that the imported products comply with their country’s regulations.</p>
			</>
		),
	},
	{
		id: 'communication-support',
		title: '8. \u2002 Communication & Support',
		content: (
			<>
				<p>
					You can contact us via email at <b>contact@polandexportflow.com</b> or through our social media channels.
				</p>
				<p>We do not guarantee response times but strive to reply as quickly as possible.</p>
			</>
		),
	},
	{
		id: 'acceptance-of-terms',
		title: '9. \u2002 Acceptance of Terms',
		content: (
			<p>By using our services, you confirm that you have read, understood, and agreed to these Terms & Conditions.</p>
		),
	},
]

export default function TermsAndConditions() {
	return <DocsPageLayout pageTitle='Terms & Conditions' sections={termsSections} />
}
