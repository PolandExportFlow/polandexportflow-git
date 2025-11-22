'use client'

import React from 'react'
import ClientOrderModal from '../common/ClientOrderModal/ClientOrderModal'
import { useOrdersListPage } from './useOrdersListPage'
import OrdersTable from './OrdersTable'

export default function OrdersListPage() {
  const {
    orders,
    loading,
    error,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    openOrder,
    closeOrder,
    modalOrderId,
    refresh,
  } = useOrdersListPage()

  return (
    <section className="section mt-[80px] lg:mt-[130px] bg-light-blue overflow-x-hidden min-h-screen">
      <div className="wrapper w-full max-w-full mx-auto relative">
        <main className="flex flex-col gap-2 md:gap-3 min-w-0">
          <div className="min-w-0">
            <OrdersTable
              orders={orders}
              loading={loading}
              onOpenOrder={openOrder}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          {error ? <p className="p-red">{error}</p> : null}

          <ClientOrderModal
            isOpen={!!modalOrderId}
            orderId={modalOrderId || ''}
            onClose={closeOrder}
            onUpdated={refresh}
            showLoadError
          />
        </main>
      </div>
    </section>
  )
}