'use client'

import React, { useMemo } from 'react'
import { History, Hash, BadgeCheck, Calendar } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import type { OrderBrief } from '../AdminProfileTypes'
import { getStatusConfig, type OrderStatus } from '@/utils/orderStatus'

type Props = {
orders: OrderBrief[]
onOpenOrder?: (orderId: string) => void
}

export default function ClientOrderHistoryPanel({ orders, onOpenOrder }: Props) {
    const dateOnly = (d: string | Date) =>
        new Date(d).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })

    const sortedOrders = useMemo(() => {
        const toTs = (v: string | Date) => new Date(v).getTime() || 0
        return [...(orders ?? [])].sort((a, b) => toTs(b.created_at) - toTs(a.created_at)) 
    }, [orders])

    return (
        <UniversalDetail
            title="Historia zamówień"
            icon={<History className="h-5 w-5" />}
            className="bg-white border-light-blue"
        >
            {sortedOrders.length ? (
                // Kontener zewnętrzny (styl z widgetu)
                <div className="rounded-lg border border-middle-blue overflow-hidden">
                    
                    {/* NAGŁÓWEK TABELI */}
                    <table className="min-w-full table-fixed text-[13px] caret-transparent">
                        <colgroup>
                            <col style={{ width: '30%' }} /> 
                            <col style={{ width: '35%' }} />
                            <col style={{ width: '35%' }} />
                        </colgroup>
                        <thead className="[&_th]:font-normal">
                            <tr className="bg-dark-blue text-white">
                                <th className="px-0 text-left">
                                    <div className="h-[56px] px-6 flex items-center gap-2">
                                        <Hash className="h-4 w-4 opacity-90" aria-hidden="true" />
                                        <span className="opacity-90">Kod</span>
                                    </div>
                                </th>
                                <th className="px-0 text-center">
                                    <div className="h-[56px] px-6 flex items-center gap-2 justify-center">
                                        <BadgeCheck className="h-4 w-4 opacity-90" aria-hidden="true" />
                                        <span className="opacity-90">Status</span>
                                    </div>
                                </th>
                                <th className="px-0 text-right ">
                                    <div className="h-[56px] px-6 flex items-center gap-2 justify-end w-full">
                                        <Calendar className="h-4 w-4 opacity-90" aria-hidden="true" />
                                        <span className="opacity-90 mr-3">Data</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                    </table>
                    
                    {/* BODY TABELI (przewijany) */}
                    <div className="overflow-y-auto custom-scroll max-h-[600px]">
                        <table className="min-w-full table-fixed text-[13px] caret-transparent">
                            <colgroup>
                                <col style={{ width: '30%' }} />
                                <col style={{ width: '35%' }} />
                                <col style={{ width: '35%' }} />
                            </colgroup>
                            
                            <tbody className="divide-y divide-ds-border">
                                {sortedOrders.map((o, idx) => {
                                    const cfg = getStatusConfig(o.order_status as OrderStatus) 
                                    const Icon = cfg.icon
                                    // NAPRZEMIENNE KOLORY TŁA (zebra)
                                    const zebra = idx % 2 === 0 ? 'bg-white' : 'bg-ds-light-blue' 

                                    return (
                                        <tr
                                            key={o.id}
                                            onClick={() => onOpenOrder?.(o.id)}
                                            role="button"
                                            tabIndex={0}
                                            className={`${zebra} cursor-pointer transition-colors duration-200 hover:bg-ds-hover text-middle-blue/80`}
                                        >
                                            <td className="px-6 align-middle py-3">
                                                <span className="font-medium truncate">{o.id}</span>
                                            </td>

                                            <td className="px-6 align-middle">
                                                <div className="flex w-full items-center justify-center py-3">
                                                    <span
                                                        // MNIEJSZY PADDING DLA STATUSU: px-3.5 py-1.5 zamiast py-2
                                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] leading-5 border shrink-0"
                                                        style={{
                                                            backgroundColor: cfg.bgColor,
                                                            color: cfg.textColor,
                                                            borderColor: cfg.textColor,
                                                        }}
                                                        title={cfg.text}
                                                    >
                                                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                        <span className="truncate">{cfg.text}</span>
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="text-right align-middle px-6 py-3">
                                                <span className="text-[13px] text-middle-blue/70 tabular-nums">
                                                    {dateOnly(o.created_at)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-[13px] opacity-70 p-4">Brak zamówień.</div>
            )}
        </UniversalDetail>
    )
}