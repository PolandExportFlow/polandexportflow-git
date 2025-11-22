'use client'

import React from 'react'
import { PackageSearch, PackagePlus, Settings } from 'lucide-react'

import QuickActionsWidget from './QuickActionsWidget/QuickActionsWidget'
// import ChatWidget from '../common/Chat/ChatWidget'
import DashboardButton from './DashboardButton'
import OrdersListWidgetConnected from './OrdersListWidget/OrdersListWidgetConnected'

export default function Dashboard() {
  return (
    <section className="section mt-[80px] lg:mt-[130px] bg-light-blue overflow-x-hidden">
      <div className="wrapper w-full max-w-full mx-auto relative">
        <main className="flex flex-col gap-2 md:gap-3 min-w-0">
          {/* TOP: trzy przyciski */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 min-w-0">
            <DashboardButton
              Icon={PackagePlus}
              title="Create Package"
              subtitle="Add products or parcels to ship"
              variant="primary"
              href="/new-request"
            />
            <DashboardButton
              Icon={PackageSearch}
              title="My Packages"
              subtitle="Track and manage your shipments"
              href="/orders"
            />
            <DashboardButton
              Icon={Settings}
              title="My Account"
              subtitle="Update your details and preferences"
              href="/settings"
            />
          </div>

          <OrdersListWidgetConnected />

          {/* Chat (LEWA) + Quick Actions (PRAWA) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3 min-w-0 items-start">
            <div className="lg:col-span-2 min-w-0 order-1 lg:order-1">
              {/* <ChatWidget /> */}
              <div className="flex items-center gap-2 mt-4 mb-2 lg:hidden">
                <div className="flex-grow h-px bg-middle-blue/20" />
                <span className="text-[12px] text-middle-blue/50 select-none whitespace-nowrap">more options</span>
                <div className="flex-grow h-px bg-middle-blue/20" />
              </div>
            </div>

            <div className="lg:col-span-1 min-w-0 order-2 lg:order-2">
              <QuickActionsWidget />
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
