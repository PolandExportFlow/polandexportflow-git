// src/components/dashboard/admin/common/AdminOrderModal/panels/PaymentPanel/QuoteList.tsx
'use client'

import React from 'react'
import { Truck, Trash2, BadgeCheck } from 'lucide-react'

// Definiujemy typ, jakiego spodziewa się ten komponent
type Quote = {
  id: string
  quote_carrier: string
  quote_carrier_fee: number
  quote_status: string
  quote_delivery_days: string // TODO: Obliczyć 'daysText' z tego
  quote_expires_at: string // TODO: Obliczyć 'expireValue' z tego
  quote_note: string
}

type Props = {
  quotes: Quote[]
  moneyFmt: (n: number, cur?: string) => string
  onDeleteQuote: (quoteId: string) => void // Funkcja od rodzica do otwarcia modala
}

export default function QuoteList({ quotes, moneyFmt, onDeleteQuote }: Props) {
  // Jeśli nie ma wycen, nic nie pokazuj
  if (!quotes || quotes.length === 0) {
    return null
  }

  return (
    <div className='space-y-2 mt-4'>
      {quotes.map(q => {
        const accepted = q.quote_status === 'accepted'
        const price = moneyFmt(Number(q.quote_carrier_fee)) // Usunięto MOCK_CURRENCY, bo moneyFmt powinien to ogarnąć
        
        // TODO: Te wartości powinny być obliczane na podstawie danych z 'q'
        const daysText = '2-3 dni'
        const expireValue = '12 d 0 h'
        const noteQ = q.quote_note || ''

        return (
          <div
            key={q.id}
            className={[
              'relative rounded-lg px-6 py-5 text-sm transition-shadow',
              accepted
                ? 'bg-green/15 border border-green/40 shadow-[0_1px_0_0_rgba(34,197,94,0.18)]'
                : 'border border-light-blue bg-white',
            ].join(' ')}>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-start gap-5 min-w-0'>
                <button
                  onClick={() => onDeleteQuote(q.id)} // Wywołanie funkcji z props
                  className='group inline-grid place-items-center h-9 w-9 rounded-full border border-light-blue/30 bg-middle-blue/10 text-middle-blue
                                  hover:bg-[#FFE4E6] hover:text-[#9F1239] hover:border-[#FBCFE8] transition-colors'
                  title='Usuń wycenę'
                  aria-label='Usuń wycenę'>
                  <Truck className='w-4 h-4 group-hover:hidden' />
                  <Trash2 className='w-4 h-4 hidden group-hover:block' />
                </button>

                <span className='flex items-center mt-1 gap-2 min-w-0 leading-none'>
                  <span className='text-[15px] font-heebo_medium truncate'>
                    {q.quote_carrier}
                  </span>

                  {accepted ? (
                    <span
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 ml-3 rounded-full text-[11px] border'
                      style={{
                        backgroundColor: 'rgba(34,197,94,0.15)',
                        color: '#065F46',
                        borderColor: 'rgba(34,197,94,0.45)',
                      }}>
                      <BadgeCheck className='w-3.5 h-3.5' />
                      Zaakceptowana
                    </span>
                  ) : null}
                </span>
              </div>

              <span className='font-heebo_medium text-middle-blue'>{price}</span>
            </div>

            <div className='mt-1 pl-14 pr-2 text-[12.5px] text-middle-blue space-y-1.5'>
              <div className='leading-5'>
                <span className='opacity-60'>Dostawa:</span> {daysText}
              </div>
              {!accepted && (
                <div className='leading-5'>
                  <span className='opacity-60'>Wycena wygasa za:</span> {expireValue}
                </div>
              )}
            </div>

            {noteQ ? (
              <div className='mt-1 pl-14 pr-2 text-[12.5px] text-middle-blue leading-6 whitespace-pre-wrap break-words'>
                <span className='opacity-60'>Notatka:</span> {noteQ}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}