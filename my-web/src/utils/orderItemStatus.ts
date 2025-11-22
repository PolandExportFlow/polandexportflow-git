// src/utils/orderItemStatus.ts
import { Circle, Hourglass, Package, BadgeCheck, AlertTriangle } from "lucide-react"

export type OrderItemStatus =
  | "none"
  | "awaiting"
  | "received"
  | "delivered"
  | "cancelled"

export interface ItemStatusConfig {
  bgColor: string
  textColor: string
  icon: any
  text: string
  progress: number
}

export const ORDER_ITEM_STATUSES: OrderItemStatus[] = [
  "none",
  "awaiting",
  "received",
  "delivered",
  "cancelled",
]

const CONFIGS: Record<OrderItemStatus, ItemStatusConfig> = {
  none: {
    bgColor: "#E3ECF8",
    textColor: "#374151",
    icon: Circle,
    text: "None",
    progress: 0,
  },
  awaiting: {
    bgColor: "#FFEDD5",
    textColor: "#9A3412",
    icon: Hourglass,
    text: "Awaiting",
    progress: 15,
  },
  received: {
    bgColor: "#DBEAFE",
    textColor: "#1E3A8A",
    icon: Package,
    text: "Received",
    progress: 50,
  },
  delivered: {
    bgColor: "#D1FAE5",
    textColor: "#065F46",
    icon: BadgeCheck,
    text: "Delivered",
    progress: 100,
  },
  cancelled: {
    bgColor: "#FFE4E6",
    textColor: "#9F1239",
    icon: AlertTriangle,
    text: "Cancelled",
    progress: 0,
  },
}

export const getOrderItemStatusConfig = (
  status: string | null | undefined
): ItemStatusConfig => {
  const key = (status ?? "none").toLowerCase().trim() as OrderItemStatus
  return CONFIGS[key] ?? CONFIGS.none
}
