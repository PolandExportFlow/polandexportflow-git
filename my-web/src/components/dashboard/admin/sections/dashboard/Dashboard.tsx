// app/admin/components/sections/dashboard/Dashboard.tsx
'use client'

import { SectionProps } from '../../types'
import TaskWidget from './TaskWidget/TaskWidget'
import NoteWidget from './NoteWidget/NoteWidget'
import WorldClockWidget from './WorldClockWidget'
import CurrencyWidget from './CurrencyWidget/CurrencyWidget'
import UniversalSectionDivider from '@/components/ui/UniversalSectionDivider'
import StatDashboard from './StatDashborad'
import UniversalCollapsibleOption from '@/components/ui/UniversalDetailOption'
import { StickyNote, Globe, Banknote } from 'lucide-react'

export default function DashboardSection({ adminUser, onNavigate }: SectionProps) {
	return (
		<div>
			<StatDashboard />

			{/* Separator z etykietą – czytelny podział strony */}
			<UniversalSectionDivider label='Zadania' />

			{/* Zadania na 100% szerokości */}
			<TaskWidget onNavigate={onNavigate} />

			{/* Drugi separator z etykietą – dół strony */}
			<UniversalSectionDivider label='Notatki i narzędzia' />

			{/* Wiersz 1: Notatki na 100% */}
			<UniversalCollapsibleOption title='Notatki' icon={<StickyNote className='w-4 h-4' />} whiteBg>
				<NoteWidget onNavigate={onNavigate} />
			</UniversalCollapsibleOption>

			{/* Wiersz 2: 2 kolumny po 50% (na mobile 1 kolumna) */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<UniversalCollapsibleOption title='World Clock' icon={<Globe className='w-4 h-4' />} whiteBg>
					<WorldClockWidget />
				</UniversalCollapsibleOption>

				<UniversalCollapsibleOption title='Kursy walut' icon={<Banknote className='w-4 h-4' />} whiteBg>
					<CurrencyWidget />
				</UniversalCollapsibleOption>
			</div>
		</div>
	)
}
