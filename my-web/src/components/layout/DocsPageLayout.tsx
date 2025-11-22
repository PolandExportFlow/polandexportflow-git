'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'
import type { SelectOption } from '@/components/ui/CustomSelect'
import UniversalInput from '@/components/ui/UniwersalInput'

// === POPRAWKA NAZWY INTERFEJSU ===
export interface DocSection {
	id: string
	title: string
	content: React.ReactNode
}

interface DocsPageLayoutProps {
	pageTitle: string
	sections: DocSection[] // Używamy nowej nazwy
}

export default function DocsPageLayout({ pageTitle, sections }: DocsPageLayoutProps) {
	// Używamy nowej nazwy
	const [activeHash, setActiveHash] = useState('')

	useEffect(() => {
		const getHash = () => {
			setActiveHash(window.location.hash || '')
		}

		getHash()
		window.addEventListener('hashchange', getHash)

		return () => {
			window.removeEventListener('hashchange', getHash)
		}
	}, [])

	const handleMobileNavChange = (hashValue: string) => {
		if (hashValue) {
			window.location.hash = hashValue
		}
	}

	const navOptions: SelectOption[] = sections.map(section => ({
		value: `#${section.id}`,
		label: section.title,
	}))

	return (
		<section className='section section-top'>
			<div className='wrapper w-full'>
				<h2>{pageTitle}</h2>
				<div className='lg:hidden mt-5 mb-8'>
					<UniversalInput
						type='select'
						label='On this page'
						name='policy-nav-mobile'
						options={navOptions}
						value={activeHash}
						onChange={val => handleMobileNavChange(val as string)}
						placeholder='Jump to section...'
						showLogos={false}
					/>
				</div>

				<div className='lg:flex lg:space-x-12 lg:mt-16'>
					<aside className='hidden lg:block w-1/4'>
						<nav className='sticky top-28 flex flex-col text-middle-blue space-y-3'>
							<h4 className='mb-4 font-made_regular'>On this page</h4>
							{sections.map(section => (
								<a
									key={section.id}
									href={`#${section.id}`}
									className={cn(
										'text-sm transition-all duration-200',
										activeHash === `#${section.id}`
											? ' font-heebo_medium opacity-100'
											: ' opacity-75 hover:opacity-100 '
									)}>
									{section.title}
								</a>
							))}
						</nav>
					</aside>

					<main className='w-full lg:w-3/4'>
						<div className='flex flex-col space-y-8 lg:space-y-12'>
							{sections.map(section => (
								<div key={section.id} id={section.id} className='flex flex-col space-y-2 scroll-mt-24'>
									<h3>{section.title}</h3>
									{section.content}
								</div>
							))}
						</div>
					</main>
				</div>
			</div>
		</section>
	)
}
