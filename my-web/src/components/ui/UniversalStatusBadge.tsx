// src/components/ui/UniversalStatusBadge.tsx
"use client"

import React from "react"

/** Minimalny kształt configu statusu */
export type BadgeCfg = {
  bgColor: string
  textColor: string
  icon: React.ComponentType<{ className?: string }>
  text: string
}

type Props = {
  status: string | null | undefined
  getConfig: (status: string | null | undefined) => BadgeCfg
  className?: string
}

/* pomocniczo: kolor obramowania z lekką alfą */
const withAlpha = (hex: string, alpha: number) => {
  if (!hex || hex[0] !== "#") return hex
  const full = hex.length === 4 ? "#" + [...hex.slice(1)].map(c => c + c).join("") : hex
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0")
  return full + a
}

const UniversalStatusBadge: React.FC<Props> = ({ status, getConfig, className }) => {
  const cfg = getConfig(status ?? "none")
  const Icon = cfg.icon
  const borderCol =
    typeof cfg.textColor === "string" ? withAlpha(cfg.textColor, 0.35) : cfg.textColor

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-[8px] text-[13px] leading-none border ${className ?? ""}`}
      style={{ backgroundColor: cfg.bgColor, color: cfg.textColor, borderColor: borderCol || cfg.textColor }}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap leading-none relative top-[0.5px]">{cfg.text}</span>
    </span>
  )
}

export default UniversalStatusBadge
