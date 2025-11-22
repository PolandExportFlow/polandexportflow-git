// messages/components/ChatHeader.tsx
'use client'

import { CheckSquare, RotateCcw } from 'lucide-react'

type Props = {
  contactName: string
  unreadCount: number
  marking: 'idle' | 'read' | 'unread'
  onToggleRead: () => void
}

export default function ChatHeader({ contactName, unreadCount, marking, onToggleRead }: Props) {
  return (
    <div className="shrink-0 h-[64px] flex items-center justify-between px-6 rounded-md border-b border-middle-blue/10 bg-gradient-to-r from-light-blue/50 to-white">
      <span className="text-middle-blue font-made_regular truncate max-w-[50%]">{contactName}</span>
      <button
        onClick={onToggleRead}
        disabled={marking !== 'idle'}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-300 border disabled:opacity-60 ${
          unreadCount > 0
            ? 'bg-light-blue/20 text-middle-blue hover:bg-light-blue/80 border-middle-blue/20'
            : 'bg-white text-middle-blue hover:bg-light-blue/70 border-middle-blue/15'
        }`}
        title={unreadCount > 0 ? 'Mark all as read' : 'Mark last as unread'}
      >
        {unreadCount > 0 ? <CheckSquare className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
        <span>{unreadCount > 0 ? (marking === 'read' ? 'Marking…' : 'Mark as read') : (marking === 'unread' ? 'Marking…' : 'Mark as unread')}</span>
      </button>
    </div>
  )
}
