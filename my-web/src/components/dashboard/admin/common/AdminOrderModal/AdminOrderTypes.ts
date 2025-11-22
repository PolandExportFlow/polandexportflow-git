import type { OrderStatus } from '@/utils/orderStatus'
// ⭐️ IMPORTUJEMY NOWY TYP STATUSU ITEMU
import type { OrderItemStatus } from '@/utils/orderItemStatus'

export type StatusBlock = {
	order_id?: string
	id?: string
	order_number: string
	order_status: OrderStatus | string
	order_type?: 'Parcel Forwarding' | 'Assisted Purchase' | string
	created_at: string
	stored_count?: number
	total_weight?: string
	user_full_name?: string | null
	user_email?: string | null
	user_id?: string | null
	selected_carrier?: string | null
	selected_tracking_link?: string | null
	selected_shipping_price?: string | null
}

export type AddressBlock = {
	order_fullname?: string | null
	order_email?: string | null
	order_phone?: string | null
	order_country?: string | null
	order_city?: string | null
	order_postal_code?: string | null
	order_street?: string | null
	order_delivery_notes?: string | null
	order_house_number?: string | null
}

export type AddressWithBuilding = {
	address: AddressBlock | null
	buildingNo: string | null
}

export type OrderPaymentTransaction = {
	id: string
	payment_id: string
	order_id: string
	transaction_amount: number
	transaction_note: string | null
	created_at: string
}

export type OrderPayment = {
	id: string
	order_id: string
	user_id: string
	payment_status: string
	payment_method_code: string | null
	payment_currency: string
	payment_note: string | null

	total_items_value: number
	total_subtotal: number
	total_service_fee: number
	payment_service_fee: number // ⭐️ PRZYWRÓCONE (procent)

	payment_fee: number
	total_expected_amount: number

	split_due: number
	split_received: number

	admin_amount_costs: number
	admin_amount_received: number
	admin_amount_profit: number // ⭐️ PRZYWRÓCONE (obliczane w UI, ale obecne w DB)

	payment_fee_pct: number | null
}

export type PaymentSummary = {
	products?: string
	shipping?: string
	service_fee?: string
	total_received_amount?: string
	total_costs_amount?: string
}

export type PaymentBlock = {
	payment_method_name?: string
	payment_method_code?: string
	payment_currency?: string
	payment_status?: string
	payment_fee_pct?: number
	paymentNote?: string | null
	summary?: PaymentSummary
}
export type PaymentDataPayload = {
	payment: OrderPayment | null
	transactions: OrderPaymentTransaction[]
}
export type ShippingQuote = {
	id: string
	quote_carrier: string
	quote_carrier_fee: string | number
	quote_delivery_days?: string | null
	quote_note?: string | null
	quote_status?: string
	is_selected?: boolean
	quote_created_at?: string
	quote_expires_at?: string | null
}

export type Attachment = {
	id: string
	storage_path: string
	file_name: string
	mime_type?: string
	created_at?: string
}

// ⭐️ USUNIĘTO STARY TYP 'ItemStatus'

export type ItemDimensions = {
	item_length: number | null
	item_width: number | null
	item_height: number | null
}

export type ItemImage = {
	id?: string | number
	file_url: string
	file_name: string
	uploaded_at?: string
	mime?: string
	storage_path?: string
	file_size?: number
}

export type OrderItem = {
	id: string
	order_id?: string
	item_number?: string
	item_url?: string | null
	item_name: string
	item_status: OrderItemStatus
	item_quantity: number
	item_value: number | null
	payment_currency: 'PLN' | 'EUR' | 'USD' | 'GBP'
	item_weight: number | null
	dimensions: ItemDimensions
	item_note?: string | null
	item_images?: ItemImage[]
}

export type AdminOrderModalData = {
	uuid: string
	status: StatusBlock
	address?: AddressBlock | null
	payment?: OrderPayment | null
	transactions?: OrderPaymentTransaction[]
	quotes?: ShippingQuote[]
	attachments?: Attachment[]
	items?: OrderItem[]
	order_note?: string
	admin_note?: string
}
