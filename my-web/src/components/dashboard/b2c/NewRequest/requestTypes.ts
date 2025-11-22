// === Enums/Maps ===
export type ServiceType = 'Assisted Purchase' | 'Parcel Forwarding'

export const SERVICE_LABEL: Record<ServiceType, string> = {
  'Assisted Purchase': 'Assisted Purchase', 
  'Parcel Forwarding': 'Parcel Forwarding',
}

// === Address -> orders.* (1:1) ===
export interface AddressModel {
  order_fullname: string
  order_phone: string
  order_country: string 
  order_city: string
  order_postal_code: string
  order_street: string
  order_house_number?: string | null
  order_delivery_notes?: string | null
}

// === Item -> order_items.* (1:1) ===
export interface OrderItemInput {
  item_name: string
  item_url?: string | null
  item_note?: string | null
  item_quantity: number
  item_value: number
  item_weight?: number | null
  item_length?: number | null
  item_width?: number | null
  item_height?: number | null
}

// === Payload do RPC user_order_create (1:1 z parametrami funkcji) ===
export interface CreateOrderArgs {
  service: ServiceType
  address: AddressModel
  items: OrderItemInput[]
  order_note?: string | null
}

// === Zwrotka z RPC (1:1) ===
export interface CreateOrderResult {
  order_id: string
  order_number: string
  storage_prefix: string
  //
  // 👇 POPRAWKA BYŁA TUTAJ 👇
  //
  items: { 
    item_id: string; 
    storage_prefix: string;
    item_number: string; // <-- DODANA TA LINIA
  }[]
}

export type UploadFileMeta = {
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
}

export type AttachPayloadItem = {
  item_id: string
  files: UploadFileMeta[]
}