// app/admin/components/sections/messages/msgTypes.ts

/* Section props (MessagesSection) */
export type SectionProps = {
  onNavigate: (section: string) => void
}

/* Minimal shape of the last message's attachments (from SQL/view) */
export type LastMessageAttachment = {
  file_name?: string            // ← opcjonalne (niektóre widoki zwracają tylko URL/licznik)
  file_url: string
  mime_type?: string
}

/* LEFT PANEL — chat list item (zgodne z tabelą/wierszem widoku `chat_list`) */
export type ConversationSummary = {
  id: string
  contact_name: string
  contact_email?: string
  contact_phone?: string
  customer_type?: 'b2b' | 'b2c'

  /** Tekst ostatniej wiadomości – pełny (jeśli dostępny). */
  last_message?: string | null

  /** Krótki snippet (fallback gdy `last_message` brak). */
  last_message_snippet: string | null

  /** Czas ostatniej wiadomości (ISO). */
  last_message_at?: string | null

  /** Nieprzeczytane dla agenta. */
  unread_count: number

  /** Ostatnie załączniki (jeśli widok je zwraca). */
  last_message_attachments: LastMessageAttachment[]

  /** Legacy/fallback – gdy widok nie zwraca tablicy, a tylko flagę. */
  last_message_has_attachments?: boolean

  /** Priorytet w kolejce. */
  priority: 'normal' | 'high' | 'urgent'

  /** Czy to „nowy” kontakt. */
  is_new?: boolean

  /** Legacy wskaźnik „pierwszy raz” (niektóre widoki tak to nazywają). */
  contact_is_first_time?: boolean

  /** Legacy: całkowita liczba wiadomości (używane do heurystyki „nowy”). */
  total_messages?: number

  /** Właściciel/opiekun czatu. */
  owner_id?: string | null
}

/* Załącznik wiadomości (środek listy) */
export type MessageAttachment = {
  id?: string
  message_id?: string
  file_name: string
  file_url: string
  mime_type?: string
  file_type?: string
  file_size?: number
  file_path?: string
  created_at?: string
  file?: File
}

/* CENTER PANEL — single message (frontendowy shape) */
export type Message = {
  id: string
  chat_id: string
  sender_id?: string
  sender_type: 'user' | 'contact' | 'system' | string
  body: string
  created_at: string

  is_read_by_agent?: boolean
  read_by_agent_at?: string | null
  is_read_by_contact?: boolean
  read_by_contact_at?: string | null

  attachments?: MessageAttachment[]
  _localStatus?: 'sending' | 'failed'
  _error?: string
}

/* RIGHT PANEL — orders & contact details */
export type ContactOrderSummary = {
  id: string
  order_number: string
  status: string
  total_price: number
  currency: string
}

export type ContactDetails = {
  id: string
  full_name: string
  email?: string
  phone?: string
  company_name?: string
  address?: string
  tags?: string[]
  orders?: ContactOrderSummary[]
  notes?: string
}
