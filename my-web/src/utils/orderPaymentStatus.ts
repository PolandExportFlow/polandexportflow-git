import { CheckCircle2, XCircle, Clock3, Circle } from 'lucide-react'

/** Typ statusów płatności */
export type OrderPaymentStatus = 'none' | 'pending' | 'accepted' | 'cancelled'

export interface PaymentStatusConfig {
	bgColor: string
	textColor: string
	icon: any
	text: string
	progress: number
}

/** Kolejność do UI */
export const ORDER_PAYMENT_STATUSES: OrderPaymentStatus[] = ['none', 'pending', 'accepted', 'cancelled']

/** Konfiguracje wizualne */
const CONFIGS: Record<OrderPaymentStatus, PaymentStatusConfig> = {
	none: {
		bgColor: '#E3ECF8',
		textColor: '#374151',
		icon: Circle,
		text: 'None',
		progress: 0,
	},
	pending: {
		bgColor: '#FFEDD5',
		textColor: '#9A3412',
		icon: Clock3,
		text: 'Pending',
		progress: 33.33,
	},
	accepted: {
		bgColor: '#D1FAE5',
		textColor: '#065F46',
		icon: CheckCircle2,
		text: 'Accepted',
		progress: 100,
	},
	cancelled: {
		bgColor: '#FFE4E6',
		textColor: '#9F1239',
		icon: XCircle,
		text: 'Cancelled/Refunded',
		progress: 0,
	},
}

/** Zwraca config; w razie błędu daje 'none' */
export const getOrderPaymentStatusConfig = (status: string | null | undefined): PaymentStatusConfig => {
	const key = (status ?? 'none').toLowerCase().trim() as OrderPaymentStatus
	return CONFIGS[key] ?? CONFIGS.none
}
