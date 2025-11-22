// src/components/dashboard/admin/common/AdminOrderModal/services/tracking.service.ts
'use client'

import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'

export type SaveTrackingArgs = {
  /** id lub order_number */
  lookup: string
  /** surowy kod z inputa */
  code: string
}

/** Zapisuje RAW code do orders.selected_tracking_link */
export async function saveTracking({ lookup, code }: SaveTrackingArgs) {
  const trimmedLookup = (lookup ?? '').trim()
  const trimmedCode = (code ?? '').trim()

  if (!trimmedLookup) throw new Error('Brak lookup (order_number).')

  try {
    const { error } = await supabase.rpc('admin_update_modal_order_tracking', {
      p_lookup: trimmedLookup,
      p_tracking_code: trimmedCode || null,
    })

    if (error) throw error
    return { code: trimmedCode }
  } catch (err) {
    logSbError('[tracking.saveTracking]', err)
    throw err
  }
}
