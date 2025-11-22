// app/.../b2cList/B2COrdersSection.tsx
'use client'

import React from 'react'
import StatB2C from './StatB2C'
import UniversalAdminCard from '../../utils/UniversalAdminCard'
import B2CSearch from './b2cList/B2CSearch'
import B2CList from './b2cList/B2CList'
import { useB2CList } from './b2cList/useB2CList'
import { useB2COrdersStats } from './useB2COrdersStats'
import UniversalSectionDivider from '@/components/ui/UniversalSectionDivider'

export default function B2COrdersSection() {
  const list = useB2CList()

  const stats = useB2COrdersStats()

  return (
    <div className="space-y-6">
      {/* Góra: metryki B2C */}
      <StatB2C
        totalOrders={stats.total}
        pendingQuotes={stats.pending_quotes}
        inProgress={stats.in_progress}
        shippedOrders={stats.shipped}
        deliveredOrders={stats.delivered}
      />

      {/* Separator jak w dashboardzie */}
      <UniversalSectionDivider label="Zamówienia B2C" />

      {/* Karta: wyszukiwarka + lista */}
      <UniversalAdminCard
        title="Zamówienia B2C"
        subtitle="Lista zamówień z zaawansowanym filtrowaniem i sortowaniem."
      >
        <div className="space-y-4">
          <B2CSearch list={list} />
          <B2CList list={list} />
        </div>
      </UniversalAdminCard>

      {/* Subtelny divider na dół sekcji */}
      <UniversalSectionDivider spaced={false} />
    </div>
  )
}
