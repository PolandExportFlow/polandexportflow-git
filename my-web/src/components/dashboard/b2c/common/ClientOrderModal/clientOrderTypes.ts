export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP'

export type MethodCode = 
    | 'paypal' 
    | 'revolut' 
    | 'stripe';

export type OrderPaymentMethodRow = {
    payment_code: MethodCode | string
    payment_method_name: string
    payment_fee: number | null
    payment_api: string | null
    payment_is_active: boolean
    payment_is_default: boolean
}

export type OrderPaymentRow = {
    id: string
    order_id: string
    user_id: string | null
    payment_method_code: MethodCode | string | null
    order_total_items_value: number | null
    payment_status: string | null
    payment_note: string | null
    payment_currency: Currency | string | null
    payment_service_fee: number | null
    created_at: string | null
    total_expected_amount: number | null
    total_received_amount: number | null
    total_costs_amount: number | null
}

export type OrderQuoteRow = {
    id: string
    order_id: string
    quote_number: string | null
    quote_carrier: string | null
    quote_carrier_fee: number | null
    quote_status: string | null
    quote_created_at: string | null
    quote_expires_at: string | null
    quote_note: string | null
    quote_delivery_days: string | number | null
}

export type OrdersMinimalRow = {
    id: string
    order_number: string
    order_status: string
    user_id: string
    admin_note: string | null
    selected_quote_id: string | null
    selected_carrier: string | null
    selected_tracking_link: string | null
    order_fullname: string | null
    order_email: string | null
    order_phone: string | null
    order_country: string | null
    order_city: string | null
    order_postal_code: string | null
    order_street: string | null
    order_house_number: string | null
    order_delivery_notes: string | null
    created_at: string | null
    order_type: string | null
    selected_shipping_price: number | null
}

export type OrderItemRow = {
    id: string
    order_id: string
    item_status: string | null
    item_name: string | null
    item_url: string | null
    item_note: string | null
    item_value: number | null
    item_quantity: number | null
    item_weight: number | null
    item_length: number | null
    item_width: number | null
    item_height: number | null
    created_at: string | null
    item_number: string | null // ✅ ZMIANA: string (zgodnie z bazą)
}

export type OrderFileRow = {
    id: string
    order_id: string
    user_id: string | null
    file_name: string
    mime_type: string | null
    file_size: string | number | null
    storage_path: string | null
    created_at: string | null
}

export type OrderItemFileRow = {
    id: string
    item_id: string
    user_id: string | null
    file_name: string
    mime_type: string | null
    file_size: string | number | null
    storage_path: string | null
    created_at: string | null
}

export type PaymentMethod = {
    code: MethodCode
    name: string
    feePct: number | null
    api: string | null
    isActive: boolean
    isDefault: boolean
}

export type ShippingQuote = {
    id: string | number
    quote_carrier: string | null
    quote_carrier_fee: number | null
    quote_delivery_days: string | number | null
    quote_status: string | null
    quote_note: string | null
    selected?: boolean | null
}

export type PaymentBreakdown = {
    productsPLN: number
    shippingPLN: number
    serviceFeePct: number
    serviceFeePLN: number
    paymentFeePct: number
    paymentFeePLN: number
    subtotalPLN: number
    totalPLN: number
    total: number
}

export type StatusPanelDB = {
    order_number: string
    order_status: string
    order_type: string | null
    order_note?: string | null
    files: Array<{
        id: string
        file_name: string
        storage_path: string | null
        mime_type: string | null
        file_size: string | number | null
        created_at: string | null
    }>
}
export type ClientFile = StatusPanelDB['files'][number]

export type PaymentPanelDB = {
    payment_currency: Currency
    payment_method_code: MethodCode
    payment_status: string
    payment_fee_pct: number | null
    order_total_items_value: number | null
    order_service_fee: number | null
    selected_shipping_price?: number | null

    split_due: number | null
    split_received: number | null

    quotes: Array<{
        id: string | number
        quote_carrier: string | null
        quote_carrier_fee: number | null
        quote_delivery_days: string | number | null
        quote_status: string | null
        quote_note: string | null
        selected?: boolean | null
    }>
}

export type AddressPanelDB = {
    order_fullname: string | null
    order_email: string | null
    order_phone: string | null
    order_country: string | null
    order_city: string | null
    order_postal_code: string | null
    order_street: string | null
    order_house_number: string | null
    order_delivery_notes?: string | null
}
export type AddressBlock = AddressPanelDB

export type TrackingPanelDB = {
    selected_carrier: string | null
    selected_tracking_link: string | null
} | null

export type ItemsPanelRowDB = {
    id: string
    item_number: string | null // ✅ ZMIANA: string
    item_status: string | null
    item_name: string | null
    item_url?: string | null
    item_note?: string | null
    item_value: number | null
    item_quantity: number | null
    item_weight: number | null
    item_length: number | null
    item_width: number | null
    item_height: number | null
    created_at: string | null
    files: Array<{
        id: string
        file_name: string
        storage_path: string | null
        mime_type: string | null
        file_size: string | number | null
        created_at: string | null
    }>
}

export type ClientOrderModalPayload = {
    statusPanel: StatusPanelDB
    paymentPanel: PaymentPanelDB 
    addressPanel: AddressPanelDB
    trackingPanel: TrackingPanelDB
    itemsPanel: ItemsPanelRowDB[]
}