'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, User2, Mail, Phone, MessageSquareText, Home, Settings, Loader2 } from 'lucide-react'
import { UniversalDetail } from '@/components/ui/UniversalDetail'
import { DetailRow } from '@/components/ui/UniversalDetailRow'
import UniversalTableInput from '@/components/ui/UniversalTableInput'
import Flag from '@/components/common/Flag'
import type { AddressPanelDB } from '../clientOrderTypes'
import { getCountryInfoByName } from '@/utils/country/countryHelper'

type Props = {
  address: AddressPanelDB | null
  onUpsertAddress?: (patch: Partial<AddressPanelDB>) => Promise<void> | void
  onUseDefaultAddress?: () => Promise<void> | void
  canEdit?: boolean
}

const EMPTY: AddressPanelDB = {
  order_fullname: null,
  order_email: null,
  order_phone: null,
  order_country: null,
  order_city: null,
  order_postal_code: null,
  order_street: null,
  order_house_number: null,
  order_delivery_notes: null,
}

export default function AddressPanelClient({
  address,
  onUpsertAddress,
  onUseDefaultAddress,
  canEdit = true,
}: Props) {
  const [form, setForm] = useState<AddressPanelDB>(address ?? EMPTY)
  const [editing, setEditing] = useState<keyof AddressPanelDB | null>(null)
  const [isLoadingDefault, setIsLoadingDefault] = useState(false)

  useEffect(() => {
    setForm(address ?? EMPTY)
  }, [address])

  const commitPatch = async (patch: Partial<AddressPanelDB>) => {
    if (!canEdit) return

    const noChange = Object.entries(patch).every(([k, v]) => (form as any)[k] === v)
    if (noChange) {
      setEditing(null)
      return
    }

    setForm(prev => ({ ...prev, ...patch }))
    setEditing(null)
    await onUpsertAddress?.(patch)
  }

  const handleCommit = async (field: keyof AddressPanelDB, rawVal: string | null) => {
    if (!canEdit) return
    const v = (rawVal ?? '').trim()
    await commitPatch({ [field]: v || null } as Partial<AddressPanelDB>)
  }

  const handleUseDefault = async () => {
    if (!canEdit || !onUseDefaultAddress) return
    setIsLoadingDefault(true)
    try {
      await onUseDefaultAddress()
      setEditing(null)
    } catch (e) {
      console.error('Failed to load default address', e)
    } finally {
      setIsLoadingDefault(false)
    }
  }

  const countryInfo = useMemo(() => getCountryInfoByName(form.order_country), [form.order_country])
  const countryIsoCode = countryInfo?.code ? countryInfo.code.toUpperCase() : null
  const countryDisplay = countryInfo?.label ?? form.order_country ?? 'Kraj'

  return (
    <UniversalDetail
      title='Address'
      icon={<MapPin className='h-5 w-5' />}
      className='bg-white border-light-blue'
    >
      <DetailRow
        icon={<User2 className='w-3.5 h-3.5' />}
        label='Imię i nazwisko'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_fullname') }] : []}
        value={
          editing === 'order_fullname' ? (
            <UniversalTableInput
              value={form.order_fullname ?? ''}
              mode='text'
              align='right'
              placeholder='Imię i nazwisko'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_fullname', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_fullname ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_fullname || 'Imię i nazwisko'}
            </span>
          )
        }
        valueText={form.order_fullname ?? ''}
      />

      <DetailRow
        icon={<Mail className='w-3.5 h-3.5' />}
        label='E-mail'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_email') }] : []}
        value={
          editing === 'order_email' ? (
            <UniversalTableInput
              value={form.order_email ?? ''}
              mode='text'
              align='right'
              placeholder='E-mail'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_email', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_email ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_email || 'E-mail'}
            </span>
          )
        }
        valueText={form.order_email ?? ''}
      />

      <DetailRow
        icon={<Phone className='w-3.5 h-3.5' />}
        label='Telefon'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_phone') }] : []}
        value={
          editing === 'order_phone' ? (
            <UniversalTableInput
              value={form.order_phone ?? ''}
              mode='text'
              align='right'
              placeholder='Telefon'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_phone', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_phone ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_phone || 'Telefon'}
            </span>
          )
        }
        valueText={form.order_phone ?? ''}
      />

      <DetailRow
        icon={<MapPin className='w-3.5 h-3.5' />}
        label='Kraj'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_country') }] : []}
        value={
          editing === 'order_country' ? (
            <UniversalTableInput
              value={form.order_country ?? ''}
              mode='text'
              align='right'
              placeholder='Kraj (nazwa lub kod)'
              widthPx={200}
              compactMobile
              autoStartEditing
              onCommit={async v => {
                if (!canEdit) return
                const raw = (v ?? '').trim()
                await commitPatch({ order_country: raw || null })
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span className='inline-flex items-center gap-2'>
              {countryIsoCode ? <Flag iso={countryIsoCode} title={countryDisplay} /> : null}
              {countryDisplay}
            </span>
          )
        }
        valueText={form.order_country ?? ''}
      />

      <DetailRow
        icon={<MapPin className='w-3.5 h-3.5' />}
        label='Miasto'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_city') }] : []}
        value={
          editing === 'order_city' ? (
            <UniversalTableInput
              value={form.order_city ?? ''}
              mode='text'
              align='right'
              placeholder='Miasto'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_city', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_city ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_city || 'Miasto'}
            </span>
          )
        }
        valueText={form.order_city ?? ''}
      />

      <DetailRow
        icon={<MapPin className='w-3.5 h-3.5' />}
        label='Kod pocztowy'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_postal_code') }] : []}
        value={
          editing === 'order_postal_code' ? (
            <UniversalTableInput
              value={form.order_postal_code ?? ''}
              mode='text'
              align='right'
              placeholder='Kod pocztowy'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_postal_code', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_postal_code ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_postal_code || 'Kod pocztowy'}
            </span>
          )
        }
        valueText={form.order_postal_code ?? ''}
      />

      <DetailRow
        icon={<MapPin className='w-3.5 h-3.5' />}
        label='Ulica'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_street') }] : []}
        value={
          editing === 'order_street' ? (
            <UniversalTableInput
              value={form.order_street ?? ''}
              mode='text'
              align='right'
              placeholder='Ulica'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_street', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_street ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_street || 'Ulica'}
            </span>
          )
        }
        valueText={form.order_street ?? ''}
      />

      <DetailRow
        icon={<MapPin className='w-3.5 h-3.5' />}
        label='Nr budynku'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_house_number') }] : []}
        value={
          editing === 'order_house_number' ? (
            <UniversalTableInput
              value={form.order_house_number ?? ''}
              mode='text'
              align='right'
              placeholder='Nr budynku'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={v => {
                if (!canEdit) return
                void handleCommit('order_house_number', (v ?? '').trim() || null)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'select-text',
                form.order_house_number ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              {form.order_house_number || 'Nr budynku'}
            </span>
          )
        }
        valueText={form.order_house_number ?? ''}
      />

      <DetailRow
        icon={<MessageSquareText className='w-3.5 h-3.5' />}
        label='Uwagi dla dostawy'
        className='!border-b-0'
        actions={canEdit ? [{ kind: 'edit', onClick: () => setEditing('order_delivery_notes') }] : []}
        value={
          editing === 'order_delivery_notes' ? (
            <UniversalTableInput
              value={form.order_delivery_notes ?? ''}
              mode='text'
              align='right'
              placeholder='Notatki dla kuriera…'
              widthPx={220}
              compactMobile
              autoStartEditing
              onCommit={async v => {
                if (!canEdit) return
                const val = (v ?? '').trim()
                await commitPatch({ order_delivery_notes: val || null })
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className={[
                'pr-3 select-text whitespace-pre-wrap break-words',
                form.order_delivery_notes ? '' : 'opacity-50',
                !canEdit ? 'cursor-not-allowed' : '',
              ].join(' ')}
              title={!canEdit ? 'Edycja zablokowana dla tego statusu' : undefined}
            >
              {form.order_delivery_notes || 'Notatki dla kuriera…'}
            </span>
          )
        }
        valueText={form.order_delivery_notes ?? ''}
      />

      {canEdit && (
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 bg-ds-light-blue rounded-md p-4 px-6'>
          <Link
            href='/settings'
            className='inline-flex items-center gap-1.5 text-sm opacity-50 hover:opacity-100 transition-opacity duration-200'
          >
            <Settings className='w-4 h-4' />
            Zmień adres domyślny
          </Link>

          <button
            type='button'
            onClick={handleUseDefault}
            disabled={!canEdit || isLoadingDefault}
            className='inline-flex items-center justify-center gap-2 rounded-md bg-ds-middle-blue border border-middle-blue/30 px-5 py-3 text-[13px] tracking-wide font-medium hover:bg-middle-blue/8 transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none'
            title='Użyj mojego adresu domyślnego'
          >
            Użyj adresu domyślnego
            {isLoadingDefault ? <Loader2 className='h-4 w-4 animate-spin' /> : <Home className='h-4 w-4' />}
          </button>
        </div>
      )}
    </UniversalDetail>
  )
}
