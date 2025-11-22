// src/components/dashboard/admin/common/AdminOrderModal/services/useNotes.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase/client'
import { logSbError } from '@/utils/supabase/errors'
import type { AdminNote, NoteCategory } from './notesTypes'
import { toDBCat, toUICat } from './notesTypes'

type NewNoteInput = { category: NoteCategory; content?: string }

export function useNotes(activeCategory: NoteCategory) {
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mapRow = (r: any): AdminNote => ({
    id: r.id as string,
    category: toUICat(r.note_category),
    content: r.note_content ?? '',
    pinned: !!r.note_is_pinned,
    createdAt: r.created_at,
  })

  const fetchNotes = useCallback(async (cat: NoteCategory) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('id, note_category, note_content, note_is_pinned, created_at')
        .eq('note_category', toDBCat(cat))
        .order('note_is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes((data ?? []).map(mapRow))
    } catch (e: any) {
      setError(e?.message ?? 'Fetch failed')
      logSbError('[useNotes.fetchNotes]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotes(activeCategory)
  }, [activeCategory, fetchNotes])

  // actions
  const add = async ({ category, content = '' }: NewNoteInput) => {
    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .insert({
          note_category: toDBCat(category),
          note_content: content,
          note_is_pinned: false,
        })
        .select('id, note_category, note_content, note_is_pinned, created_at')
        .single()
      if (error) throw error
      const created = mapRow(data)
      setNotes(prev => [created, ...prev])
      return created
    } catch (e) {
      logSbError('[useNotes.add]', e)
      throw e
    }
  }

  const edit = async (id: string, patch: { content?: string; category?: NoteCategory; pinned?: boolean }) => {
    const update: Record<string, any> = {}
    if (patch.content !== undefined) update.note_content = patch.content
    if (patch.category !== undefined) update.note_category = toDBCat(patch.category)
    if (patch.pinned !== undefined) update.note_is_pinned = patch.pinned

    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .update(update)
        .eq('id', id)
        .select('id, note_category, note_content, note_is_pinned, created_at')
        .single()
      if (error) throw error
      const updated = mapRow(data)
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)))
      return updated
    } catch (e) {
      logSbError('[useNotes.edit]', e)
      throw e
    }
  }

  const remove = async (id: string) => {
    const before = notes
    setNotes(prev => prev.filter(n => n.id !== id))
    try {
      const { error } = await supabase.from('admin_notes').delete().eq('id', id)
      if (error) throw error
    } catch (e) {
      // rollback
      setNotes(before)
      logSbError('[useNotes.remove]', e)
      throw e
    }
  }

  const togglePin = async (id: string) => {
    const n = notes.find(x => x.id === id)
    if (!n) return
    const next = !n.pinned
    setNotes(prev => prev.map(x => (x.id === id ? { ...x, pinned: next } : x)))
    try {
      const { error } = await supabase.from('admin_notes').update({ note_is_pinned: next }).eq('id', id)
      if (error) throw error
    } catch (e) {
      // rollback
      setNotes(prev => prev.map(x => (x.id === id ? { ...x, pinned: !next } : x)))
      logSbError('[useNotes.togglePin]', e)
      throw e
    }
  }

  const refetch = () => fetchNotes(activeCategory)

  return { notes, loading, error, add, edit, remove, togglePin, refetch }
}
