// src/components/dashboard/admin/common/AdminOrderModal/panels/PaymentPanel/PaymentAdminBalance.tsx
'use client'

import React, { useState } from 'react'
import { Banknote } from 'lucide-react'
import { DetailRow } from '@/components/ui/UniversalDetailRow'

// ⭐️ ZAKTUALIZOWANE PROPSY ⭐️
type Props = {
  revenuePLN: number
  costPLN: number
  profitPLN: number
  onSetAdminData: (costs: number, received: number) => void // 👈 TEN PROP JEST OCZEKIWANY
  moneyFmt: (n: number, cur?: string) => string
  createEditableInput: (value: number, onCommit: (v: string | number) => void, onCancel: () => void) => React.ReactNode
}

export default function PaymentAdminBalance({
  revenuePLN,
  costPLN,
  profitPLN,
  onSetAdminData,
  moneyFmt,
  createEditableInput,
}: Props) {
  const [isEditingRevenue, setIsEditingRevenue] = useState(false)
  const [isEditingCost, setIsEditingCost] = useState(false)

  const handleRevenueCommit = (value: string | number) => {
    const newRevenue = Number(value) || 0
    onSetAdminData(costPLN, newRevenue) // Przekaż stary koszt i nowy przychód
    setIsEditingRevenue(false)
  }
  const handleRevenueCancel = () => {
    setIsEditingRevenue(false)
  }

  const handleCostCommit = (value: string | number) => {
    const newCost = Number(value) || 0
    onSetAdminData(newCost, revenuePLN) // Przekaż nowy koszt i stary przychód
    setIsEditingCost(false)
  }
  const handleCostCancel = () => {
    setIsEditingCost(false)
  }

  return (
    <div className='mt-2 border border-middle-blue/10 rounded-md p-4 py-6'>
      <h4 className='text-sm font-heebo_medium text-middle-blue mb-4'>Finanse (Admin)</h4>
      <DetailRow
        flushRight
        icon={<Banknote className='w-3.5 h-3.5' />}
        label='Nasz przychód (+)'
        actions={isEditingRevenue ? [] : [{ kind: 'edit', onClick: () => setIsEditingRevenue(true) }]}
        onValueClick={isEditingRevenue ? undefined : () => setIsEditingRevenue(true)}
        value={
          isEditingRevenue ? (
            createEditableInput(revenuePLN, handleRevenueCommit, handleRevenueCancel)
          ) : (
            <span>{moneyFmt(revenuePLN)}</span>
          )
        }
        valueText={String(revenuePLN)}
      />

      <DetailRow
        flushRight
        icon={<Banknote className='w-3.5 h-3.5' />}
        label='Nasze koszty (-)'
        actions={isEditingCost ? [] : [{ kind: 'edit', onClick: () => setIsEditingCost(true) }]}
        onValueClick={isEditingCost ? undefined : () => setIsEditingCost(true)}
        value={
          isEditingCost ? (
            createEditableInput(costPLN, handleCostCommit, handleCostCancel)
          ) : (
            <span>{moneyFmt(costPLN)}</span>
          )
        }
        valueText={String(costPLN)}
      />

      <DetailRow
        flushRight
        icon={<Banknote className='w-3.5 h-3.5' />}
        label='Nasz dochód (=)'
        actions={[]}
        value={<span>{moneyFmt(profitPLN)}</span>}
        valueText={String(profitPLN)}
      />
    </div>
  )
}