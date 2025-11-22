'use client'

import { memo, useCallback, useState } from 'react'
import {
  Home,
  Building2,
  MessageCircle,
  Users,
  FileText,
  Warehouse,
  FolderOpen,
  Bot,
  BarChart3,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import { AdminUser, SectionId } from './types'
import { AnimatePresence, motion } from 'framer-motion'

type NavItem = {
  name: string
  id: SectionId
  icon: LucideIcon
  badge?: string | null
}

const NAV_ITEMS: Readonly<NavItem[]> = Object.freeze([
  { name: 'Dashboard', id: 'dashboard', icon: Home, badge: null },
  { name: 'B2C Zamówienia', id: 'b2c-orders', icon: ShoppingBag, badge: null },
  { name: 'B2B Zamówienia', id: 'b2b-orders', icon: Building2, badge: null },
  { name: 'Wiadomości', id: 'messages', icon: MessageCircle, badge: null },
  { name: 'Klienci', id: 'clients', icon: Users, badge: null },
  { name: 'Wyceny', id: 'quotes', icon: FileText, badge: null },
  { name: 'Magazyn', id: 'warehouse', icon: Warehouse, badge: null },
  { name: 'Zasoby', id: 'resources', icon: FolderOpen, badge: null },
  { name: 'PEFlow AI', id: 'ai', icon: Bot, badge: null },
  { name: 'Statystyki', id: 'stats', icon: BarChart3, badge: null },
])

interface AdminNavProps {
  activeSection: SectionId
  onSectionChange: (sectionId: SectionId) => void
  adminUser: AdminUser
  onSignOut: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

interface SidebarContentProps {
  navigation: Readonly<NavItem[]>
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
  adminUser: AdminUser
  onSignOut: () => void
  collapsed: boolean
}

export default function AdminNav({
  activeSection,
  onSectionChange,
  adminUser,
  onSignOut,
  collapsed,
  onToggleCollapse,
}: AdminNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleOpenMobile = useCallback(() => setMobileMenuOpen(true), [])
  const handleCloseMobile = useCallback(() => setMobileMenuOpen(false), [])
  const handleSectionChange = useCallback(
    (id: SectionId) => onSectionChange(id),
    [onSectionChange]
  )

  const allowed = adminUser.assigned_sections
  const visibleNavItems =
    allowed.includes('all') || allowed.length === 0
      ? NAV_ITEMS
      : NAV_ITEMS.filter(item => allowed.includes(item.id))

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden bg-white border-b border-light-blue px-4 py-3 flex justify-between items-center">
        <button
          onClick={handleOpenMobile}
          className="p-2 rounded-md text-middle-blue hover:bg-light-blue transition-colors"
          aria-label="Otwórz menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="text-[14px] md:text-[20px] text-middle-blue font-made_bold">
          Poland<span className="text-red">Export</span>Flow
        </div>

        <div className="w-10" />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed inset-0 bg-middle-blue/75"
              onClick={handleCloseMobile}
            />
            <motion.aside
              className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl font-heebo_medium overflow-hidden"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }}
            >
              <div className="h-[60px] flex items-center justify-between px-6 border-b border-light-blue">
                <div className="text-[16px] text-middle-blue font-made_bold">
                  Poland<span className="text-red">Export</span>Flow
                </div>
              </div>

              <SidebarContent
                navigation={visibleNavItems}
                activeSection={activeSection}
                onSectionChange={(id) => { handleSectionChange(id); handleCloseMobile() }}
                adminUser={adminUser}
                onSignOut={onSignOut}
                collapsed={false}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <motion.aside
          className="sticky top-0 h-[100svh] flex flex-col bg-white border-r border-light-blue overflow-hidden font-heebo_medium"
          animate={{ width: collapsed ? 68 : 300 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onPointerDownCapture={(e) => e.stopPropagation()}
          data-collapsed={collapsed ? 'true' : 'false'}
        >
          {/* Header: logo + chevron (jak wcześniej) */}
          <div className="flex-shrink-0 border-b border-light-blue h-[100px]">
            {collapsed ? (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
                className="flex items-center justify-center w-full h-full text-middle-blue hover:bg-light-blue/50 transition-colors"
                title="Rozwiń menu"
                aria-label="Rozwiń menu"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
                className="flex items-center justify-between w-full h-full px-6 text-middle-blue hover:bg-light-blue/50 transition-colors"
                title="Zwiń menu"
                aria-label="Zwiń menu"
              >
                <div className="text-[14px] md:text-[20px] text-middle-blue font-made_bold">
                  Poland<span className="text-red">Export</span>Flow
                </div>
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          <SidebarContent
            navigation={visibleNavItems}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            adminUser={adminUser}
            onSignOut={onSignOut}
            collapsed={collapsed}
          />
        </motion.aside>
      </div>
    </>
  )
}

const SidebarContent = memo(function SidebarContent({
  navigation,
  activeSection,
  onSectionChange,
  onSignOut,
  collapsed,
}: SidebarContentProps) {
  const baseItem =
    'group flex items-center justify-between w-full px-6 h-[64px] transition-colors duration-150 border-b border-light-blue/50'
  const activeItem = 'bg-light-blue text-middle-blue'
  const idleItem = 'text-middle-blue hover:bg-light-blue/50'

  const handleItemClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation()
      const id = (e.currentTarget.dataset.id as SectionId) || 'dashboard'
      onSectionChange(id)
    },
    [onSectionChange]
  )

  return (
    <>
      <nav
        className="flex-1 space-y-0 overflow-y-auto will-change-[scroll-position]"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {navigation.map(item => {
          const isActive = activeSection === item.id
          const href = `#${item.id}`
          return (
            <a
              key={item.id}
              href={href}
              data-id={item.id}
              onClick={handleItemClick}
              className={`${baseItem} relative ${isActive ? activeItem : idleItem}`}
              title={collapsed ? item.name : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex-shrink-0">
                <item.icon className="h-5 w-5 text-middle-blue" />
              </div>

              {!collapsed && (
                <span className="truncate mx-4 flex-1 text-left">{item.name}</span>
              )}

              {item.badge && (
                <span
                  className={`${
                    collapsed
                      ? 'absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px]'
                      : 'ml-6 px-3 py-0.5 text-[13px]'
                  } bg-gradient-to-r from-[#d1fae5] to-[#a7f3d0] text-[#065f46] rounded-full border border-[#065f46]/20`}
                >
                  {item.badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Stopka tylko dla przykładu – możesz zostawić/wyciąć */}
      {activeSection === 'stats' && (
        <div className="border-t border-light-blue">
          <button
            onClick={(e) => { e.stopPropagation(); onSignOut() }}
            className={`group flex items-center w-full h-[60px] px-6 text-middle-blue hover:text-red hover:bg-light-blue/50 ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
            title={collapsed ? 'Wyloguj' : undefined}
          >
            <LogOut className="h-5 w-5 text-middle-blue group-hover:text-red transition-colors flex-shrink-0" />
            {!collapsed && <span className="ml-3">Wyloguj</span>}
          </button>
        </div>
      )}
    </>
  )
})
