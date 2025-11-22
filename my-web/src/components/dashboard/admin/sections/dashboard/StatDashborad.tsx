'use client'

import { PackagePlus, MessageCircle, DollarSign, Truck, FileText } from 'lucide-react'
import { UniversalStatWidget } from '../../utils/UniversalStatWidget'

type StatDashboardProps = {
  newParcels?: number
  openQuotes?: number
  unreadMessages?: number
  pendingPayments?: number
  shippedParcels?: number
}

export default function StatDashboard({
  newParcels = 0,
  openQuotes = 0,
  unreadMessages = 0,
  pendingPayments = 0,
  shippedParcels = 0,
}: StatDashboardProps) {
  const items = [
    { icon: PackagePlus,   label: 'Nowe paczki',            value: newParcels },
    { icon: FileText,      label: 'Otwarte wyceny',         value: openQuotes },
    { icon: MessageCircle, label: 'Nieodpisane', value: unreadMessages },
    { icon: DollarSign,    label: 'Oczekujące płatności',   value: pendingPayments },
    { icon: Truck,         label: 'Wysłane paczki',         value: shippedParcels },
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
