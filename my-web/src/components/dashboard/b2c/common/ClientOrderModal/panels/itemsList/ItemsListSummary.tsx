'use client'

import React from 'react'
import { ListChecks, ListOrdered, Banknote, Scale, Plus } from 'lucide-react'

type Props = {
    totalItems: number
    totalQty: number
    totalValue: number
    totalWeight: number
    onAddItem?: () => void
}

const Stat = ({
    Icon,
    label,
    value,
    suffix,
    // Zmieniamy nazwę propsa na bardziej logiczną: czy w ogóle pokazać label
    showLabel = true, 
}: {
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    label: string
    value: React.ReactNode
    suffix?: string
    showLabel?: boolean
}) => (
    <div className='inline-flex items-center gap-2 min-w-0 px-3 py-2 rounded-md bg-ds-light-blue border border-middle-blue/10'>
        <Icon className='w-3.5 h-3.5 opacity-70 shrink-0' />
        
        {/* 🛑 FIX: Usuwamy 'hidden md:inline'. Jeśli showLabel=true, to po prostu pokazujemy. */}
        {showLabel && (
            <span className='text-middle-blue/80 whitespace-nowrap opacity-80'>{label}:</span>
        )}
        
        <span className='inline-flex items-baseline gap-1 min-w-0'>
            <b className='tabular-nums font-heebo_medium truncate'>{value}</b>
            {suffix ? <span className='text-middle-blue/70 whitespace-nowrap text-[12px]'>{suffix}</span> : null}
        </span>
    </div>
)

const ItemsListSummary: React.FC<Props> = ({ totalItems, totalQty, totalValue, totalWeight, onAddItem }) => {
    const handleAdd = () => {
        try { onAddItem?.() } catch (e) { /* ignore */ }
    }

    return (
        <div className='flex flex-col md:flex-row md:items-center md:justify-between w-full text-[13px] text-middle-blue/90 pt-3 pb-2 gap-4 md:gap-6'>
            
            {/* MOBILE: 2x2 (Bez etykiet, same ikony) */}
            <div className='grid grid-cols-2 gap-2 w-full md:hidden'>
                <Stat Icon={ListChecks} label='Items' value={totalItems} showLabel={false} />
                <Stat Icon={ListOrdered} label='Quantity' value={totalQty} showLabel={false} />
                <Stat Icon={Banknote} label='Value' value={totalValue.toFixed(2)} suffix='PLN' showLabel={false} />
                <Stat Icon={Scale} label='Weight' value={totalWeight.toFixed(2)} suffix='kg' showLabel={false} />
            </div>

            {/* DESKTOP: jeden rząd (Z etykietami) */}
            <div className='hidden md:flex md:items-center md:gap-3'>
                <Stat Icon={ListChecks} label='Items' value={totalItems} showLabel={true} />
                <Stat Icon={ListOrdered} label='Quantity' value={totalQty} showLabel={true} />
                <Stat Icon={Banknote} label='Value' value={totalValue.toFixed(2)} suffix='PLN' showLabel={true} />
                <Stat Icon={Scale} label='Weight' value={totalWeight.toFixed(2)} suffix='kg' showLabel={true} />
            </div>

            {/* Add button */}
            {onAddItem && (
                <button
                    type='button'
                    onClick={handleAdd}
                    className='w-full md:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-middle-blue/10 bg-ds-light-blue text-[13px] text-middle-blue font-heebo_medium transition-all duration-200 hover:bg-middle-blue/8 active:bg-middle-blue/12 whitespace-nowrap'
                >
                    <Plus className='w-4 h-4 text-middle-blue/80' />
                    <span className='relative top-[0.5px]'>Add New Item</span>
                </button>
            )}
        </div>
    )
}

export default ItemsListSummary