import { Plane, XCircle, CheckCircle2, Package, Calculator, FileText, FilePlus } from "lucide-react"

// 1. Definiujemy tablicę jako "as const" - to jest nasze jedyne źródło prawdy
export const UI_STATUSES = [
  "created",
  "submitted",
  "quote_ready",
  "preparing_order",
  "shipped",
  "delivered",
  "cancelled",
] as const

export type OrderStatus = (typeof UI_STATUSES)[number]

export interface StatusConfig {
  bgColor: string
  textColor: string
  icon: any
  text: string
}

/** Minimalny, stały config (bez progressów) */
const CONFIGS: Record<OrderStatus, StatusConfig> = {
  created: {
    bgColor: "#E3ECF8",
    textColor: "#374151",
    icon: FilePlus,
    text: "Created",
  },
  submitted: {
    bgColor: "#FFEDD5",
    textColor: "#9A3412",
    icon: FileText,
    text: "Submitted",
  },
  quote_ready: {
    bgColor: "#E0E7FF",
    textColor: "#3730A3",
    icon: Calculator,
    text: "Quote Ready",
  },
  preparing_order: {
    bgColor: "#E0F2FE",
    textColor: "#075985",
    icon: Package,
    text: "Processing",
  },
  shipped: {
    bgColor: "#EDE9FE",
    textColor: "#5B21B6",
    icon: Plane,
    text: "Shipped",
  },
  delivered: {
    bgColor: "#D1FAE5",
    textColor: "#065F46",
    icon: CheckCircle2,
    text: "Delivered",
  },
  cancelled: {
    bgColor: "#FFE4E6",
    textColor: "#9F1239",
    icon: XCircle,
    text: "Cancelled",
  },
}

/** Helper: rzutuje na kanoniczny status lub zwraca 'created' */
const toStatus = (s: string | null | undefined): OrderStatus => {
  // Rzutujemy na string[], żeby TS nie krzyczał przy includes na readonly tuple
  const valid = (UI_STATUSES as readonly string[]).includes(String(s))
  return valid ? (s as OrderStatus) : "created"
}

/** Zawsze zwróci config */
export const getStatusConfig = (status: OrderStatus | string | null | undefined): StatusConfig =>
  CONFIGS[toStatus(status as string)]

/** Uprawnienia (bez aliasów) */
export const isOrderEditable = (s: OrderStatus | string | null | undefined) => {
  const k = toStatus(s as string)
  return k === "created" || k === "submitted" || k === "quote_ready"
}

export const canCancelOrder = (s: OrderStatus | string | null | undefined) => {
  const k = toStatus(s as string)
  return k === "created" || k === "submitted" || k === "quote_ready" || k === "preparing_order"
}

export const canChangePayment = (s: OrderStatus | string | null | undefined) =>
  toStatus(s as string) === "quote_ready"

export const canChangeAddress = (s: OrderStatus | string | null | undefined) => {
  const k = toStatus(s as string)
  return k !== "shipped" && k !== "delivered"
}

export const canAddProducts = (s: OrderStatus | string | null | undefined) => {
  const k = toStatus(s as string)
  return k === "created" || k === "submitted" || k === "quote_ready"
}

export const canChangeShipping = (s: OrderStatus | string | null | undefined) =>
  toStatus(s as string) === "quote_ready"