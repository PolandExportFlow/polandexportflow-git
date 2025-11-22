// src/components/dashboard/admin/common/AdminOrderModal/panels/PaymentPanel/PaymentStatus.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Banknote, BadgeCheck, Percent } from 'lucide-react'
import UniversalDropdownModal from '@/components/ui/UniversalDropdownModal'
import UniversalStatusBadge from '@/components/ui/UniversalStatusBadge'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import { DetailRow } from '@/components/ui/UniversalDetailRow'

import {
  getOrderPaymentStatusConfig,
  ORDER_PAYMENT_STATUSES,
} from '@/utils/orderPaymentStatus'

const FEE_OPTIONS_PCT = [0, 4, 5, 6, 7, 8, 9]

type DropdownOption = {
  value: string
  content: React.ReactNode
}

type Props = {
  paymentStatus: string
  onChangePaymentStatus: (value: string) => void
  servicePct: number
  onUpsertServiceFeePct: (value: number) => void
  note: string
  onUpsertPaymentNote: (value: string) => void
}

export default function PaymentStatus({
  paymentStatus,
  onChangePaymentStatus,
  servicePct,
  onUpsertServiceFeePct,
  note,
  onUpsertPaymentNote,
}: Props) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const statusOptions: DropdownOption[] = useMemo(() => {
    return ORDER_PAYMENT_STATUSES.map(s => ({
      value: s,
      content: <UniversalStatusBadge status={s} getConfig={getOrderPaymentStatusConfig} />,
    }))
  }, [])

  const feeOptions: DropdownOption[] = useMemo(() => {
    return FEE_OPTIONS_PCT.map(pct => ({
      value: String(pct),
      content: <span>{pct}%</span>,
    }))
  }, [])

  const handleNoteCommit = (value: string) => {
    onUpsertPaymentNote(value)
    setIsEditingNote(false)
  }

  const handleNoteCancel = () => {
    setIsEditingNote(false)
  }

  return (
    <div>
      <DetailRow
        flushRight
        icon={<BadgeCheck className='w-3.5 h-3.5' />}
        label='Status płatności'
        value={
          <div className='w-[340px]'>
            <UniversalDropdownModal
              selected={paymentStatus}
              className='ml-[-4px]'
              button={
                <UniversalStatusBadge
                  status={paymentStatus}
                  getConfig={getOrderPaymentStatusConfig}
                />
              }
              options={statusOptions}
              onSelect={val => onChangePaymentStatus(val as string)}
              menuClassName='min-w-[280px] [&_button]:h-[44px]'
            />
          </div>
        }
      />

      <DetailRow
        flushRight
        icon={<Percent className='w-3.5 h-3.5' />}
        label='Service fee (%)'
        value={
          <UniversalDropdownModal
            selected={String(servicePct)}
            className='ml-[-4px]'
            button={
              <span className='inline-flex items-center gap-2 rounded-full px-3.5 py-[6px] text-[13px] leading-none bg-light-blue text-middle-blue border border-middle-blue/30'>
                {servicePct}%
              </span>
            }
            options={feeOptions}
            onSelect={val => onUpsertServiceFeePct(Number(val))}
            menuClassName='min-w-[140px] [&_button]:h-[40px]'
          />
        }
      />

      <DetailRow
        flushRight
        icon={<Banknote className='w-3.5 h-3.5' />}
        label='Notatka do płatności'
        actions={isEditingNote ? [] : [{ kind: 'edit', onClick: () => setIsEditingNote(true) }]}
        onValueClick={isEditingNote ? undefined : () => setIsEditingNote(true)}
        value={
          isEditingNote ? (
            <UniversalTableInput
              value={note}
              mode='text'
              align='right'
              placeholder='—'
              widthPx={300}
              autoStartEditing
              onCommit={handleNoteCommit}
              onCancel={handleNoteCancel}
            />
          ) : (
            <span className={`select-text ${note ? '' : 'opacity-50'}`}>{note || '—'}</span>
          )
        }
        valueText={note}
      />
    </div>
  )
}