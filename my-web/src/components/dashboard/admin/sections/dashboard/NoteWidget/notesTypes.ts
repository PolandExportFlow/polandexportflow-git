export type NoteCategory = 'paczki' | 'finanse' | 'klienci'         // UI
export type DBNoteCategory = 'todo' | 'note' | 'idea'               // DB kolumna: note_category

export interface AdminNote {
  id: string
  category: NoteCategory
  content: string
  pinned: boolean
  createdAt?: string
}

// UI -> DB
export const toDBCat = (ui: NoteCategory): DBNoteCategory => {
  if (ui === 'paczki') return 'todo'
  if (ui === 'finanse') return 'note'
  return 'idea' // 'klienci'
}

// DB -> UI
export const toUICat = (db: DBNoteCategory): NoteCategory => {
  if (db === 'todo') return 'paczki'
  if (db === 'note') return 'finanse'
  return 'klienci' // 'idea'
}
