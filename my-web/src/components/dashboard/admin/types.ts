// types.ts

// 🔑 wszystkie sekcje w panelu
export type SectionId =
  | 'dashboard'
  | 'b2c-orders'
  | 'b2b-orders'
  | 'clients'
  | 'messages'
  | 'quotes'
  | 'warehouse'
  | 'resources'
  | 'ai'
  | 'stats'

// 👤 rekord z tabeli public.admin_users
export interface AdminUser {
  user_id: string             // uuid -> users.id (PRIMARY KEY)
  assigned_sections: string[] // np. ['all'] albo ['b2c-orders','messages']
}

// props przekazywane do każdej sekcji
export interface SectionProps {
  adminUser: AdminUser
  onNavigate: (id: SectionId) => void
}
