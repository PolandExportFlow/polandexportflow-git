'use client'

import { Copy, Check, X } from 'lucide-react'
import type { Message, MessageAttachment } from '../msgTypes'
import { formatTime, getIsRead, isImg } from '../fetchers/utils'
import { dlUrl, linkifyParts } from '@/components/dashboard/common/Chat/shared'

type Props = {
  m: Message
  mine: boolean
  canDelete: boolean
  copiedId?: string | null
  onCopy: (id: string) => void
  onDelete?: (id: string) => void
  onPreview?: (url: string) => void
  onDeleteAttachment?: (msgId: string, att: MessageAttachment) => void
}

export default function MessageBubble({
  m, mine, canDelete, copiedId, onCopy, onDelete, onPreview, onDeleteAttachment,
}: Props) {
  return (
    <div
      className={`relative group max-w-[75%] break-words rounded-2xl px-4 py-3 shadow-sm ${
        mine ? 'bg-middle-blue text-white ml-auto' : 'bg-white border border-middle-blue/15 text-middle-blue'
      }`}
    >
      {/* hover actions */}
      <div className="absolute -top-3 right-2 z-20 flex items-center gap-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-300">
        <button
          onClick={() => onCopy(m.id)}
          className="w-8 h-8 rounded-full grid place-items-center bg-middle-blue border border-white/30 text-white shadow-md hover:bg-red transition-colors duration-300"
          title="Copy"
        >
          {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete?.(m.id)}
            className="w-8 h-8 rounded-full grid place-items-center bg-middle-blue border border-white/30 text-white shadow-md hover:bg-red transition-colors duration-300"
            title="Delete message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* tekst */}
      {m.body && (
        <span
          className={`block text-sm leading-relaxed ${mine ? 'text-white' : 'text-middle-blue'}`}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {linkifyParts(m.body).map((p, i) =>
            p.t === 'text'
              ? <span key={i}>{p.v}</span>
              : (
                <a
                  key={i}
                  href={p.v}
                  target="_blank"
                  rel="noreferrer"
                  className={`${mine ? 'underline' : 'text-middle-blue underline hover:opacity-80'} break-all`}
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {p.v}
                </a>
              )
          )}
        </span>
      )}

      {/* załączniki */}
      {m.attachments?.length ? (
        <div className="mt-2 flex gap-3 flex-wrap items-start">
          {m.attachments.map(att => (
            <div key={att.id} className="relative group/image">
              {isImg(att) ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-20 h-20 rounded-md object-cover hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md cursor-pointer"
                  draggable={false}
                  onClick={() => att.file_url && onPreview?.(att.file_url)}
                />
              ) : (
                <a
                  href={dlUrl(att.file_url, att.file_name)}
                  download
                  className="w-20 h-20 bg-light-blue/50 rounded-md flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md"
                  title={`Download ${att.file_name || 'file'}`}
                >
                  <span className="text-middle-blue font-semibold text-xs">
                    {att.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </a>
              )}
              {!!att.message_id && !!att.id && (
                <button
                  onClick={() => onDeleteAttachment?.(m.id, att)}
                  className="absolute -top-2 -right-2 bg-middle-blue/60 hover:bg-red text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/image:opacity-100 transition duration-200"
                  title="Delete file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* meta */}
      <div className={`mt-2 flex items-center justify-between text-[10px] font-heebo_regular tracking-wide ${mine ? 'text-white/75' : 'text-middle-blue/60'}`}>
        <span>{formatTime(m.created_at)}</span>
        <span className="flex items-center gap-2">
          {mine && !(m as any)._localStatus && (
            getIsRead(m, true)
              ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />read</span>
              : <span>sent</span>
          )}
          {(m as any)._localStatus === 'sending' && <span className="italic opacity-70">sending…</span>}
          {(m as any)._localStatus === 'failed' && <span className="text-red">failed</span>}
        </span>
      </div>
    </div>
  )
}
