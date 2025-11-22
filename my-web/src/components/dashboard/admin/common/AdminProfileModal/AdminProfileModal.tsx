// app/.../admin/common/AdminProfileModal/AdminProfileModal.tsx
'use client'

import React, { ComponentProps, useCallback, useRef, useState } from 'react'
import { User, RefreshCcw } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import UniversalSkel from '@/components/ui/UniversalSkel'

import type { AdminProfile, FileItem } from './AdminProfileTypes'
import { useAdminProfileModal } from './useAdminProfileModal'
import ClientDataPanel from './panels/ClientDataPanel'
import ClientAddressPanel from './panels/ClientAddressPanel'
import ClientNotePanel from './panels/ClientNotePanel'
import ClientOrderHistoryPanel from './panels/ClientOrderHistoryPanel'
import ClientFilesPanel from './panels/ClientFilesPanel'
import ClientAnalyticsPanel from './panels/ClientAnalyticsPanel'
import AdminOrderModal from '../AdminOrderModal/AdminOrderModal'
import UniversalImageModal from '@/components/ui/UniversalImageModal'

type BaseModalProps = Omit<ComponentProps<typeof Modal>, 'children' | 'title' | 'icon' | 'actions'>

type Props = BaseModalProps & {
    profileId: string
    title?: string
    onOpenOrder?: (orderId: string) => void
}

export default function AdminProfileModal({
    isOpen,
    onClose,
    className,
    title = 'Client Profile',
    profileId,
    onOpenOrder,
    ...rest
}: Props) {
    const {
        loading,
        error,
        profile,
        loadForUser,
        refresh, 
        saveNote,
    } = useAdminProfileModal()

    const [orderIdForModal, setOrderIdForModal] = useState<string | null>(null)
    const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null)
    const focusRef = useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
        if (isOpen && profileId) {
            void loadForUser(profileId)
        }
    }, [isOpen, profileId, loadForUser])

    const handleOpenOrder = useCallback((orderId: string) => {
        setOrderIdForModal(orderId)
        onOpenOrder?.(orderId)
    }, [onOpenOrder])
    
    const handleFileClick = useCallback((url: string) => {
        setSelectedFileUrl(url)
    }, [])
    
    const currentProfile = profile?.id === profileId ? profile : null
    
    // NAPRAWA BŁĘDU: Pobieramy imię i nazwisko z zagnieżdżonego address.default_full_name
    const name = currentProfile?.address?.default_full_name || currentProfile?.full_name || title 
    
    const displayId = currentProfile?.user_code || profileId; 
    
    const isRefreshingOrLoading = loading; 
    
    const showSkeleton = loading && (!currentProfile || currentProfile.id === profileId);


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            panelWidth="min(98vw, 1720px)" 
            panelMaxHeight="97dvh"
            initialFocusRef={focusRef}
            bodyClassName="pb-10 md:pb-12"
            className={className}
            title={
                <span className="tracking-wide text-middle-blue/90">
                    <b className='text-middle-blue'>{name}</b> 
                    <span className='text-[13px] opacity-50'> ({displayId})</span>
                </span>
            }
            icon={<User className="h-5 w-5" />}
            actions={
                <button
                    onClick={() => profileId && void refresh(profileId)} 
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-middle-blue hover:bg-middle-blue/10 disabled:opacity-40"
                    title="Odśwież"
                    aria-label="Odśwież"
                    disabled={isRefreshingOrLoading} 
                >
                    <RefreshCcw className={`h-4 w-4 ${isRefreshingOrLoading ? 'animate-spin' : ''}`} /> 
                </button>
            }
            {...rest}
        >
            {showSkeleton && (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    <UniversalSkel h={300} />
                    <UniversalSkel h={300} />
                    <UniversalSkel h={300} />
                    <UniversalSkel h={260} />
                    <UniversalSkel h={260} />
                    <UniversalSkel h={260} />
                </div>
            )}
            
            {!showSkeleton && (
                <>
                    {error ? (
                        <div className="rounded-lg border border-red/30 bg-red/5 p-4 text-sm">
                            Błąd ładowania profilu: <b>{error}</b>
                        </div>
                    ) : !currentProfile ? (
                        <div className="rounded-lg border border-light-blue bg-white p-4 text-sm">
                            Brak danych profilu do wyświetlenia.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:gap-5 md:grid-cols-2 2xl:grid-cols-3 font-heebo_regular">
                            <ClientDataPanel profile={currentProfile} />
                            <ClientAddressPanel profile={currentProfile} />
                            
                            <ClientAnalyticsPanel profile={currentProfile} /> 

                            <ClientOrderHistoryPanel
                                orders={currentProfile.orders ?? []}
                                onOpenOrder={handleOpenOrder}
                            />
                            
                            <ClientFilesPanel 
                                files={currentProfile.files ?? ([] as FileItem[])} 
                                onFileOpen={handleFileClick} 
                            />
                            
                            <ClientNotePanel
                                profileId={currentProfile.id}
                                initialNote={currentProfile.admin_note ?? ''} 
                                onSave={saveNote} 
                            />
                        </div>
                    )}
                </>
            )}

            <AdminOrderModal
                isOpen={!!orderIdForModal}
                onClose={() => setOrderIdForModal(null)}
                orderId={orderIdForModal || ''}
            />
            
            <UniversalImageModal
                selectedPhoto={selectedFileUrl}
                onClose={() => setSelectedFileUrl(null)}
            />
        </Modal>
    )
}