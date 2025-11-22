// messages/components/MessageInput.tsx
'use client'

import { Paperclip, SendHorizontal, X } from 'lucide-react'
import type { MessageAttachment } from '../msgTypes'
import { isImg } from '../fetchers/utils' // <— przeniesione z fetchers/utils

type LocalAttachment = MessageAttachment & { file?: File }

type Props = {
  text: string
  setText: (v: string) => void
  attachments: LocalAttachment[]
  setAttachments: (v: LocalAttachment[]) => void
  onSend: () => void
  sending: boolean
  onPreview: (url: string) => void
}

export default function MessageInput({
  text, setText, attachments, setAttachments, onSend, sending, onPreview,
}: Props) {

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map<LocalAttachment>(f => ({
      id: crypto.randomUUID(),
      message_id: undefined,
      file_name: f.name,
      file_url: URL.createObjectURL(f),
      file_type: f.type || 'application/octet-stream',
      file_size: f.size,
      file_path: '',
      file: f,
    }))
    setAttachments([...(attachments || []), ...next])
  }

  const revokeIfBlob = (url?: string | null) => {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url) } catch {}
    }
  }

  const removeAttachment = (id: string) => {
    const target = attachments.find(a => a.id === id)
    revokeIfBlob(target?.file_url)
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const clearComposer = () => {
    // zwolnij blob URLe
    attachments.forEach(a => revokeIfBlob(a.file_url))
    setText('')
    setAttachments([])
  }

  const handleSend = () => {
    if (sending) return
    const onlySpaces = !text.trim()
    const noFiles = attachments.length === 0
    if (onlySpaces && noFiles) return
    onSend()
    // czyścimy od razu – wiadomość i tak idzie optymistycznie w wątku
    clearComposer()
  }

  return (
    <div
      className="shrink-0 p-3 pt-4 bg-middle-blue/6 rounded-2xl"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
    >
      {/* podgląd załączników */}
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-3 flex-wrap items-start">
          {attachments.map(att => (
            <div key={att.id} className="relative group/image">
              {isImg(att) ? (
                <img
                  src={att.file_url || ''}
                  alt={att.file_name || 'file'}
                  className="w-20 h-20 rounded-md object-cover hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md cursor-pointer"
                  draggable={false}
                  onClick={() => att.file_url && onPreview(att.file_url)}
                />
              ) : (
                <div
                  className="w-20 h-20 bg-light-blue/50 rounded-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md"
                  onClick={() => att.file_url && window.open(att.file_url, '_blank')}
                >
                  <span className="text-middle-blue font-semibold text-xs">
                    {att.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id!)}
                className="absolute -top-2 -right-2 bg-middle-blue/60 hover:bg-red text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/image:opacity-100 transition duration-200"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* input + wysyłka */}
      <div className="flex gap-1">
        <button
          onClick={() => document.getElementById('chat-file-input')?.click()}
          className="p-4 rounded-lg border border-transparent bg-white hover:border-red transition-colors duration-300"
          aria-label="Add attachment"
          title="Add attachment"
        >
          <Paperclip className="w-5 h-5 text-middle-blue/50" />
        </button>
        <input
          id="chat-file-input"
          type="file"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.currentTarget.value = '' }}
        />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault()
              handleSend()
            } else if (e.key === 'Escape') {
              clearComposer()
            }
          }}
          onPaste={e => {
            const files = Array.from(e.clipboardData.files || [])
            if (files.length) { e.preventDefault(); addFiles(files) }
          }}
          placeholder="Message"
          className="flex-1 resize-y min-h-[60px] rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none"
        />

        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && attachments.length === 0)}
          className="px-7 rounded-lg bg-middle-blue text-white font-made_light text-[14px] hover:bg-middle-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>{sending ? 'Sending…' : 'Send'}</span>
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
