'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { PackagePlus, MapPin, Tag, FileCheck, Loader2 } from 'lucide-react'
import RequestNav from './RequestNav'
import RequestFooter from './RequestFooter'
import ServiceStep from './steps/ServiceStep'
import AddressStep from './steps/AddressStep'
import ItemsStep, { type Item, newItem } from './steps/ItemsStep'
import SummaryStep from './steps/SummaryStep'
import SuccessStep from './steps/SuccessStep'
import { useCreateOrder } from './hooks/useCreateOrder'
import { getCountryInfoByName, getAllCountries } from '@/utils/country/countryHelper'
import type { ServiceType, AddressModel, OrderItemInput, CreateOrderArgs } from './requestTypes'
import { supabase } from '@/utils/supabase/client'
// Importujemy nasze nowe helpery
import { toNumOrUndefined, toNumOrZero, toQty, isNonEmptyString } from '@/utils/newRequestFormHelper'

export type StepKey = 'service' | 'address' | 'items' | 'summary'

const STEPS = [
    { key: 'service', label: 'Service', Icon: PackagePlus },
    { key: 'address', label: 'Address', Icon: MapPin },
    { key: 'items', label: 'Items', Icon: Tag },
    { key: 'summary', label: 'Summary', Icon: FileCheck },
] as const

// Mapowanie itemu z UI na strukturę bazy danych przy użyciu helperów
const mapItemToDB = (i: Item): OrderItemInput => ({
    item_name: (i.item_name || '').trim(),
    item_url: (i.item_url || '')?.trim() || null,
    item_note: (i.item_note || '')?.trim() || null,
    item_quantity: toQty(i.item_quantity),
    item_value: toNumOrZero(i.item_value),
    item_weight: toNumOrUndefined(i.item_weight) ?? null,
    item_length: toNumOrUndefined(i.item_length) ?? null,
    item_width: toNumOrUndefined(i.item_width) ?? null,
    item_height: toNumOrUndefined(i.item_height) ?? null,
})

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')

// TEGO NIE RUSZAMY - zgodnie z prośbą
const generateShortId = (): string => Math.random().toString(36).substring(2, 5)

function getItemIdFromDBItem(dbItem: any): string {
    if (dbItem?.item_id) return String(dbItem.item_id)
    if (dbItem?.id) return String(dbItem.id)

    console.error('❌ Missing item id on createdOrder.items element:', dbItem)
    throw new Error('Created order item does not contain an ID.')
}

// --- Komponent Overlay (Loading Screen) ---
function LoadingOverlay({ message }: { message: string }) {
    return (
        <div className='fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-300'>
            <div className='bg-white p-6 rounded-xl shadow-2xl border border-middle-blue/10 flex flex-col items-center gap-4'>
                <Loader2 className='h-10 w-10 animate-spin text-middle-blue' />
                <span className='text-middle-blue font-medium tracking-wide text-lg'>{message}</span>
            </div>
        </div>
    )
}

export default function NewRequest() {
    const [step, setStep] = useState<StepKey>('service')
    const [service, setService] = useState<ServiceType | undefined>()
    const [address, setAddress] = useState<AddressModel>({
        order_fullname: '',
        order_phone: '',
        order_country: '',
        order_city: '',
        order_email: '',
        order_postal_code: '',
        order_street: '',
        order_house_number: '',
        order_delivery_notes: '',
    })
    const [items, setItems] = useState<Item[]>([newItem()])
    const [orderNote, setOrderNote] = useState<string>('')

    const { createOrder, isLoading: isCreatingOrder, error: createOrderError } = useCreateOrder()
    const [isUploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [submittedOrder, setSubmittedOrder] = useState<string | null>(null)

    const countryOptions = useMemo(() => getAllCountries('en'), [])

    // Logika walidacji kroków
    const isServiceDone = !!service
    const isAddressDone = useMemo(() => {
        const a = address
        return Boolean(a.order_fullname?.trim() && a.order_phone?.trim() && getCountryInfoByName(a.order_country))
    }, [address])
    
    const isItemsDone = useMemo(
        () =>
            items.length > 0 &&
            items.every(
                i => isNonEmptyString(i.item_name) && toQty(i.item_quantity) >= 1 && toNumOrZero(i.item_value) > 0
            ),
        [items]
    )

    const maxReachableIndex = isServiceDone ? (isAddressDone ? (isItemsDone ? 3 : 2) : 1) : 0

    const next = () => setStep(prev => (prev === 'service' ? 'address' : prev === 'address' ? 'items' : 'summary'))
    const back = () => setStep(prev => (prev === 'summary' ? 'items' : prev === 'items' ? 'address' : 'service'))
    const onAddressChange = useCallback((patch: Partial<AddressModel>) => setAddress(s => ({ ...s, ...patch })), [])
    const onItemsChange = useCallback(setItems, [])

    const isLoading = isCreatingOrder || isUploading
    const canSubmit = isServiceDone && isAddressDone && isItemsDone && !isLoading

    const handleSubmit = async () => {
        if (!canSubmit || !service) return
        setUploadError(null)

        try {
            // 1. Create Order w bazie danych
            const dbItems: OrderItemInput[] = items.map(mapItemToDB)
            const payload: CreateOrderArgs = {
                service,
                address,
                items: dbItems,
                order_note: orderNote.trim() || null,
            }

            const createdOrder = await createOrder(payload)
            if (!createdOrder || !createdOrder.items) throw new Error('Failed to create order, data missing.')

            const orderNumber = createdOrder.order_number

            // 2. Upload plików (jeśli istnieją)
            const uiItemsWithFiles = items.map(i => ({ files: i.files || [] }))
            const hasFiles = uiItemsWithFiles.some(i => i.files.length > 0)

            if (hasFiles) {
                setUploading(true)
                const uploadPromises: Promise<void>[] = []

                for (let i = 0; i < createdOrder.items.length; i++) {
                    const itemFromDB = createdOrder.items[i]
                    const itemId = getItemIdFromDBItem(itemFromDB)
                    const itemNumber = String(itemFromDB.item_number ?? i + 1)

                    const files = uiItemsWithFiles[i]?.files || []
                    for (const file of files) {
                        uploadPromises.push(
                            uploadFileForItem({
                                itemId,
                                orderNumber,
                                itemNumber,
                                file,
                            })
                        )
                    }
                }

                await Promise.all(uploadPromises)
                setUploading(false)
            }

            setSubmittedOrder(orderNumber)
        } catch (err: any) {
            setUploading(false)
            setUploadError(err.message)
            console.error('Order flow failed:', err)
        }
    }

    return (
        <section className='section mt-[80px] lg:mt-[130px] bg-light-blue relative min-h-[600px]'>
            {/* Loading Overlay - pojawia się na całym ekranie sekcji */}
            {isLoading && (
                <LoadingOverlay message={isCreatingOrder ? 'Creating your order...' : 'Uploading attachments...'} />
            )}

            <div className='wrapper w-full max-w-[1100px] mx-auto'>
                {!submittedOrder && (
                    <RequestNav
                        steps={STEPS as any}
                        activeKey={step}
                        maxReachableIndex={maxReachableIndex}
                        onStepClick={(idx, key) => {
                            // Blokujemy nawigację podczas ładowania
                            if (!isLoading && idx <= maxReachableIndex) setStep(key as StepKey)
                        }}
                    />
                )}
                <div className='mt-6'>
                    {submittedOrder ? (
                        <SuccessStep orderNumber={submittedOrder} />
                    ) : (
                        <>
                            {step === 'service' && (
                                <ServiceStep 
                                    value={service} 
                                    onChange={setService} 
                                    onContinue={next} 
                                />
                            )}
                            {step === 'address' && (
                                <AddressStep
                                    address={address}
                                    onChange={onAddressChange}
                                    countries={countryOptions}
                                    onBack={back}
                                    onContinue={next}
                                />
                            )}
                            {step === 'items' && (
                                <ItemsStep 
                                    items={items} 
                                    onItemsChange={onItemsChange} 
                                    onBack={back} 
                                    onContinue={next} 
                                />
                            )}
                            {step === 'summary' && (
                                <SummaryStep
                                    service={service}
                                    address={address}
                                    items={items}
                                    orderNote={orderNote}
                                    onChangeOrderNote={setOrderNote}
                                    onBack={back}
                                    onSubmit={canSubmit ? handleSubmit : undefined}
                                    isCreatingOrder={isCreatingOrder}
                                    isUploading={isUploading}
                                />
                            )}
                        </>
                    )}
                </div>
                {(createOrderError || uploadError) && (
                    <div className='mt-4 text-[13px] text-red font-medium text-center bg-red/5 p-3 rounded-md border border-red/20'>
                        Something went wrong: {String(createOrderError || uploadError)}
                    </div>
                )}
                <RequestFooter />
            </div>
        </section>
    )
}

// --- UPLOAD HELPER FUNCTION ---
type UploadArgs = {
    itemId: string
    orderNumber: string
    itemNumber: string
    file: File
}

async function uploadFileForItem({ itemId, orderNumber, itemNumber, file }: UploadArgs) {
    try {
        const cleanName = safeName(file.name)
        const uniqueId = generateShortId()
        const storage_path = `${orderNumber}/items/${itemNumber}/${uniqueId}__${cleanName}`

        const { data: genData, error: genError } = await supabase.functions.invoke(
            'user_order_item_file_upload_generate_url',
            {
                body: {
                    storage_path,
                    file_size: file.size,
                    mime_type: file.type,
                    item_id: itemId,
                },
            }
        )

        if (genError) {
            console.error('❌ SUPABASE INVOKE ERROR:', genError)
            throw new Error(`Generate URL failed: ${JSON.stringify(genError)}`)
        }

        if (!genData || (genData as any).error) {
            throw new Error(
                `Generate URL failed: ${(genData as any)?.error || 'Unknown edge function error'}`
            )
        }

        const { presignedUrl } = genData as { presignedUrl: string }

        if (!presignedUrl) {
            throw new Error('Invalid data from user_order_item_file_upload_generate_url (missing URL)')
        }

        const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        })

        if (!uploadResponse.ok) {
            const txt = await uploadResponse.text().catch(() => '')
            throw new Error(`R2 Upload failed: ${txt} (${uploadResponse.status})`)
        }

        console.log(`✅ File uploaded: ${file.name} → ${storage_path}`)
    } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err)
        throw err
    }
}