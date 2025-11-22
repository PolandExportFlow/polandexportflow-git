export type OrderBrief = {
    id: string
    order_number?: string
    created_at: string
    order_status: string
}

export type FileItem = {
    id: string
    storage_path: string
    file_name: string
    mime_type?: string
    created_at: string
}

export type ClientAnalytics = {
    orders_count: number
    first_order_at?: string
    last_order_at?: string
    lifetime_value_pln: number
    avg_order_value_pln: number
}

export type Address = {
    default_full_name?: string
    default_email?: string
    default_phone?: string
    default_country?: string
    default_city?: string
    default_postal?: string
    default_street?: string
    default_apartment?: string
}

export type AdminProfile = {
    id: string
    account_type?: string
    created_at: string

    full_name?: string
    email?: string
    phone?: string

    address?: Address

    is_verified?: boolean
    user_code?: string

    admin_note?: string
    orders?: OrderBrief[]
    files?: FileItem[]
    analytics?: ClientAnalytics
}