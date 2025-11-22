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
  Icon, label, value, suffix, showLabelOnMd = true,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: React.ReactNode
  suffix?: string
  showLabelOnMd?: boolean
}) => (
  <div className="inline-flex items-center gap-2 min-w-0 px-3 py-2 rounded-md bg-ds-light-blue border border-middle-blue/10">
    <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" />
    {showLabelOnMd && <span className="hidden md:inline text-middle-blue/80 whitespace-nowrap">{label}:</span>}
    <span className="inline-flex items-baseline gap-1 min-w-0">
      <b className="tabular-nums font-heebo_medium truncate">{value}</b>
      {suffix ? <span className="text-middle-blue/70 whitespace-nowrap">{suffix}</span> : null}
    </span>
  </div>
)

export default function ItemsPanelSummary({ totalItems, totalQty, totalValue, totalWeight, onAddItem }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full text-[13px] text-middle-blue/90 pt-3 pb-2 gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-2 w-full md:hidden">
        <Stat Icon={ListChecks} label="Pozycje" value={totalItems} showLabelOnMd={false} />
        <Stat Icon={ListOrdered} label="Ilość" value={totalQty} showLabelOnMd={false} />
        <Stat Icon={Banknote} label="Wartość" value={totalValue.toFixed(2)} suffix="PLN" showLabelOnMd={false} />
        <Stat Icon={Scale} label="Waga" value={totalWeight.toFixed(2)} suffix="kg" showLabelOnMd={false} />
      </div>

      <div className="hidden md:flex md:items-center md:gap-3">
        <Stat Icon={ListChecks} label="Pozycje" value={totalItems} />
        <Stat Icon={ListOrdered} label="Ilość" value={totalQty} />
        <Stat Icon={Banknote} label="Wartość" value={totalValue.toFixed(2)} suffix="PLN" />
        <Stat Icon={Scale} label="Waga" value={totalWeight.toFixed(2)} suffix="kg" />
      </div>

      <button
        type="button"
        onClick={() => void onAddItem?.()}
        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-middle-blue/10 bg-ds-light-blue text-[13px] text-middle-blue font-heebo_medium transition-all duration-200 hover:bg-middle-blue/8 active:bg-middle-blue/12"
      >
        <Plus className="w-4 h-4 text-middle-blue/80" />
        <span className="relative top-[0.5px]">Dodaj pozycję</span>
      </button>
    </div>
  )
}
