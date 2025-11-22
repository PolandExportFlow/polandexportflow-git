'use client'

import React from 'react'
import UniversalNote from '@/components/ui/UniversalNote'

type Props = {
	profileId?: string
	initialNote?: string
	onSave: (userId: string, note: string) => Promise<string>
}

export default function ClientNotePanel({ profileId, initialNote = '', onSave }: Props) {
	return (
		<div className='relative overflow-visible pr-6 pb-6'>
			<UniversalNote
				title='Notatka administracyjna'
				targetId={profileId}
				initialNote={initialNote}
				onSave={(targetId, note) => {
					if (!targetId) return Promise.resolve('')
					return onSave(targetId, note)
				}}
			/>
		</div>
	)
}
