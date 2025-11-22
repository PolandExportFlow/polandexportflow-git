// app/.../sections/clients/ClientsSection.tsx
'use client'

import React from 'react'
import UniversalSectionDivider from '@/components/ui/UniversalSectionDivider'
import UniversalAdminCard from '../../utils/UniversalAdminCard'

import ClientsStat from './ClientsStat'
import ClientsSearch from './ClientsSearch'
import ClientsList from './ClientsList'
import { useClientsList } from './useClientsList'
import { useClientsStats } from './useClientsStats'  
import type { SectionProps } from '../../types'

export default function ClientsSection(_props: SectionProps) {
  const list = useClientsList()
  const kpis = useClientsStats() 

  return (
    <div className="space-y-6">
      <ClientsStat
        totalClients={kpis.total}
        returningClients={kpis.returning}
        b2cClients={kpis.b2c}
        b2bClients={kpis.b2b}
        active30d={kpis.active30d}
      />

      <UniversalSectionDivider label="Klienci" />

      <UniversalAdminCard title="Lista klientów" subtitle="Wyszukuj, filtruj, sortuj i otwieraj profile.">
        <div className="space-y-4">
          <ClientsSearch list={list} />
          <ClientsList list={list} />
        </div>
      </UniversalAdminCard>

      <UniversalSectionDivider spaced={false} />
    </div>
  )
}