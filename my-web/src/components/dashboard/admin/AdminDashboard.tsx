'use client'

import { useEffect, useMemo, useState, useCallback, type ComponentType } from 'react'
import AdminNav from './AdminNav'
import type { SectionId, SectionProps, AdminUser } from './types'
import DashboardSection from './sections/dashboard/Dashboard'
import MessagesSection from './sections/messages/MessagesSection'
import B2COrdersSection from './sections/b2c/B2COrdersSection'
import ClientsSection from './sections/clients/ClientsSection'
import { CalendarDays } from 'lucide-react'
import { useHashSection } from './utils/useHashSection'

const Placeholder: ComponentType<SectionProps> = () => (
	<div>
		<p className='text-middle-blue/50 mb-4'>Ta sekcja jest w trakcie rozwoju.</p>
	</div>
)

const Sections: Record<SectionId, ComponentType<SectionProps>> = {
	dashboard: DashboardSection,
	'b2c-orders': B2COrdersSection,
	'b2b-orders': Placeholder,
	clients: ClientsSection,
	messages: MessagesSection,
	quotes: Placeholder,
	warehouse: Placeholder,
	resources: Placeholder,
	ai: Placeholder,
	stats: Placeholder,
}

export default function AdminDashboard({ adminUser, onSignOut }: { adminUser: AdminUser; onSignOut: () => void }) {
	const activeSection = useHashSection('dashboard') as SectionId
	const onSectionChange = useCallback((id: SectionId) => {
		if (typeof window !== 'undefined') window.location.hash = id
	}, [])

	const SectionComponent = Sections[activeSection]

	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
		if (typeof window === 'undefined') return false
		return window.localStorage.getItem('pef_admin_sidebar_collapsed') === '1'
	})
	useEffect(() => {
		try {
			window.localStorage.setItem('pef_admin_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
		} catch {}
	}, [sidebarCollapsed])
	const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed(c => !c), [])

	const allowed = useMemo(
		() => (adminUser.assigned_sections ?? []).map(s => String(s).toLowerCase()),
		[adminUser.assigned_sections]
	)
	const showAll = allowed.includes('all') || allowed.length === 0
	const hasAccess = showAll || allowed.includes(activeSection)

	const names: Record<SectionId, string> = {
		dashboard: 'Dashboard',
		'b2c-orders': 'B2C Zamówienia',
		'b2b-orders': 'B2B Zamówienia',
		clients: 'Klienci',
		messages: 'Wiadomości',
		quotes: 'Wyceny',
		warehouse: 'Magazyn',
		resources: 'Zasoby',
		ai: 'PEFlow AI',
		stats: 'Statystyki',
	}

	return (
		<div className='min-h-screen flex'>
			<AdminNav
				adminUser={adminUser}
				onSignOut={onSignOut}
				collapsed={sidebarCollapsed}
				onToggleCollapse={toggleSidebarCollapsed}
				onSectionChange={onSectionChange}
				activeSection={activeSection} 
			/>

			<div className='flex-1 overflow-y-auto bg-light-blue max-w-10xl mx-auto px-12 py-8'>
				<div className='mb-6 relative'>
					<h2>{names[activeSection]}</h2>
					{activeSection === 'dashboard' && (
						<p className='text-middle-blue opacity-70 absolute top-0 right-0 flex items-center gap-2'>
							<CalendarDays className='h-4 w-4' aria-hidden='true' />
							{new Date().toLocaleDateString('pl-PL', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</p>
					)}
				</div>

				{!hasAccess ? (
					<div className='rounded-lg bg-red p-6'>
						<span className='font-made_regular text-[white] text-[16px]'>
							Brak uprawnień do sekcji: <span className='font-medium'>{activeSection}</span>
						</span>
					</div>
				) : (
					<SectionComponent adminUser={adminUser} onNavigate={onSectionChange} />
				)}
			</div>
		</div>
	)
}
