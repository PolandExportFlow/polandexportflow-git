'use client'

import { ClipboardList, FileText, Loader, Truck, CheckCircle2 } from 'lucide-react'
import { UniversalStatWidget } from '../../utils/UniversalStatWidget'

type StatB2CProps = {
  totalOrders?: number
  pendingQuotes?: number
  inProgress?: number
  shippedOrders?: number
  deliveredOrders?: number
}

export default function StatB2C({
  totalOrders = 0,
  pendingQuotes = 0,
  inProgress = 0,
  shippedOrders = 0,
  deliveredOrders = 0,
}: StatB2CProps) {
  const items = [
    { icon: ClipboardList, label: 'Wszystkie zamówienia', value: totalOrders },
    { icon: FileText,      label: 'Oczekujące na wycenę', value: pendingQuotes },
    { icon: Loader,        label: 'W trakcie realizacji', value: inProgress },
    { icon: Truck,         label: 'Nadane',               value: shippedOrders },
    { icon: CheckCircle2,  label: 'Dostarczone',          value: deliveredOrders },
  ] as const

  return (
    <UniversalStatWidget
      stats={items.map(i => ({
        icon: i.icon,
        label: i.label,
        value: i.value,
        variant: 'compact',
      }))}
    />
  )
}
