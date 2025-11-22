// app/.../b2c/b2cList/B2CTypes.ts
import type { OrderStatus } from '@/utils/orderStatus'

export type OrderItemPreview = { name: string; qty: number }

export type B2COrder = {
id: string
order_number: string 
user_id: string 
order_fullname: string
country?: string | null 
status: OrderStatus
created_at: string 
admin_amount_received: number 
admin_amount_costs: number 
items: OrderItemPreview[]
tracking_link?: string | null 
selected_carrier?: string | null
}

export type Filters = {
query: string
statuses: OrderStatus[]
min_value?: number 
max_value?: number 
date_from?: string 
date_to?: string 
country?: string
}