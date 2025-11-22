// messages/components/MessagesList.tsx
'use client'

import MessageBubble from './MessageBubble'
import type { Message, MessageAttachment } from '../msgTypes'
import { dayLabel, isSameDay, toIso } from '../fetchers/utils'

type Props = {
  messages: Message[]
  firstUnreadIdx: number
  isMine: (m: Message) => boolean
  canDeleteMsg: (m: Message) => boolean
  copiedId: string | null
  onCopy: (id: string) => void
  onDeleteMessage: (id: string) => void
  onPreview: (url: string) => void
  onDeleteAttachment: (msgId: string, att: MessageAttachment) => void
}

export default function MessagesList({
  messages, firstUnreadIdx, isMine, canDeleteMsg, copiedId,
  onCopy, onDeleteMessage, onPreview, onDeleteAttachment,
}: Props) {
  if (messages.length === 0) {
    return <div className="text-center text-middle-blue/40 py-6">No messages</div>
  }

  return (
    <>
      {messages
        .filter(m => (m.body?.trim()?.length ?? 0) > 0 || (m.attachments?.length ?? 0) > 0)
        .map((m, idx) => {
          const mine = isMine(m)
          const prev = messages[idx - 1]
          const needDayDivider = !prev || !isSameDay(new Date(toIso(prev?.created_at ?? '')), new Date(toIso(m.created_at)))
          const showUnreadDivider = idx === firstUnreadIdx
          const allowDeleteMsg = canDeleteMsg(m)

          return (
            <div key={m.id}>
              {needDayDivider && (
                <div className="sticky top-2 z-10 text-center my-2">
                  <span className="px-3 py-1 text-[11px] rounded-full bg-white/70 border border-middle-blue/10 text-middle-blue/70 shadow-sm">
                    {dayLabel(new Date(toIso(m.created_at)))}
                  </span>
                </div>
              )}
              {showUnreadDivider && (
                <div className="text-center my-2">
                  <span className="px-3 py-1 text-[11px] rounded-full bg-light-blue border border-middle-blue/20 text-middle-blue">
                    New
                  </span>
                </div>
              )}

              <MessageBubble
                m={m}
                mine={mine}
                canDelete={allowDeleteMsg}
                copiedId={copiedId}
                onCopy={onCopy}
                onDelete={onDeleteMessage}
                onPreview={onPreview}
                onDeleteAttachment={onDeleteAttachment}
              />
            </div>
          )
        })}
    </>
  )
}
