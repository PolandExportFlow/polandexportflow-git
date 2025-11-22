'use client'

import React from 'react'

interface DropdownItemProps {
  icon?: React.ReactNode
  label: string
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  withDivider?: boolean
  /** Dodatkowe klasy (np. wyróżnienie New Order) */
  className?: string
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  label,
  onClick,
  withDivider = true,
  className = '',
}) => {
  const base =
    'w-full flex items-center gap-3 px-5 py-5 text-left transition-colors text-[15px] ' +
    'text-middle-blue hover:bg-light-blue/60 hover:text-dark-blue'
  const divider = withDivider ? ' border-t border-light-blue/70' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base}${divider} ${className}`}
    >
      {icon && (
        <span className="w-5 h-5 inline-flex items-center justify-center">
          {icon}
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

export default DropdownItem
