// items.service.ts (POPRAWIONE TYPY ZWRACANE)
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { OrderItem, ItemImage } from '../../AdminOrderTypes' 

const sb = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export type ItemPatch = Record<string, any>

// Typ zwracany przez RPC (dla add/update)
type ItemResponse = OrderItem

// Payload dla RPC dodającego załączniki
export type ItemAttachmentPayload = (Pick<ItemImage, 'file_name' | 'mime'> & {
    id: string;
    storage_path: string;
    file_size?: number;
    created_at?: string;
})[]

/** ADD via RPC: admin_order_item_add */
export async function createItem(orderId: string, patch: ItemPatch): Promise<ItemResponse> {
  const { data, error } = await sb().rpc('admin_order_item_add', {
    p_order_id: orderId,
    p_patch: patch,
  })
  if (error) throw new Error(error.message)
  return data as ItemResponse
}

/** UPDATE via RPC: admin_order_item_update */
export async function updateItem(itemId: string, patch: ItemPatch): Promise<ItemResponse> {
  const { data, error } = await sb().rpc('admin_order_item_update', {
    p_item_id: itemId,
    p_patch: patch,
  })
  if (error) throw new Error(error.message)
  return data as ItemResponse
}

/** DELETE via RPC: admin_order_item_delete */
export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await sb().rpc('admin_order_item_delete', {
    p_item_id: itemId,
  })
  if (error) throw new Error(error.message)
}

// --- NOWE FUNKCJE DLA ZAŁĄCZNIKÓW ---

/** * 🚀 NOWA (POPRAWIONA): ADD ATTACHMENTS 
 * SQL zwraca SETOF order_items_attachments, więc typem jest ItemImage[]
 */
export async function addItemAttachments(itemId: string, attachments: ItemAttachmentPayload): Promise<ItemImage[]> {
  const { data, error } = await sb().rpc('admin_order_item_attachments_add', {
    p_item_id: itemId,
    p_attachments: attachments,
  })
  if (error) throw new Error(error.message)
  // ⭐️ Zwraca tablicę ItemImage
  return (data as any[]) as ItemImage[]
}

/** * 🚀 NOWA (POPRAWIONA): DELETE ATTACHMENTS
 * SQL zwraca text[], więc typem jest string[]
 */
export async function removeItemAttachments(itemId: string, attachmentIds: string[]): Promise<string[] | null> {
  const { data, error } = await sb().rpc('admin_order_item_attachments_delete', {
    p_item_id: itemId,
    p_attachment_ids: attachmentIds,
  })
  if (error) throw new Error(error.message)
   // ⭐️ Zwraca tablicę string[] (usuniętych ID)
  return data as string[] | null
}