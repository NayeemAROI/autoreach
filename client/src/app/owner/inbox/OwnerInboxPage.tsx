import { useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { MessageCircle, Send, Archive, Tag } from 'lucide-react'

export default function OwnerInboxPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: inboxData, loading } = useApi<any>('/api/inbox')
  const threads = inboxData?.conversations || inboxData?.threads || []

  const { data: activeThread } = useApi<any>(activeId ? `/api/inbox/${activeId}` : null)

  const filtered = search
    ? threads.filter((t: any) => (t.leadName || t.lead_name || '').toLowerCase().includes(search.toLowerCase()))
    : threads

  const messages = activeThread?.messages || []
  const activeLead = activeThread?.lead || threads.find((t: any) => t.id === activeId) || null

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
      {/* Thread List */}
      <div className="w-80 border-r border-zinc-800/60 flex flex-col">
        <div className="p-3 border-b border-zinc-800/40">
          <SearchInput value={search} onChange={setSearch} placeholder="Search conversations..." />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && !loading && (
            <EmptyState icon={<MessageCircle className="w-6 h-6" />} title="No conversations" description="Inbox messages will appear here." />
          )}
          {filtered.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors',
                activeId === t.id && 'bg-zinc-800/50'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-sm font-medium', t.unread ? 'text-white' : 'text-zinc-400')}>{t.leadName || t.lead_name || 'Lead'}</span>
                <span className="text-[10px] text-zinc-600">{formatRelativeTime(t.lastMessageAt || t.updated_at || t.createdAt)}</span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{t.lastMessage || t.last_message || ''}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Pane */}
      <div className="flex-1 flex flex-col">
        {activeId && activeLead ? (
          <>
            <div className="px-5 py-3 border-b border-zinc-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{activeLead.leadName || activeLead.lead_name || activeLead.firstName || 'Lead'}</h3>
                <p className="text-[11px] text-zinc-500">{activeLead.company || activeLead.title || ''}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><Archive className="w-4 h-4" /></button>
                <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><Tag className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map((msg: any, i: number) => (
                <div key={msg.id || i} className={cn('max-w-[75%] rounded-2xl px-4 py-2.5', msg.direction === 'outgoing' || msg.sender === 'me' ? 'ml-auto bg-violet-600/20 text-violet-200' : 'bg-zinc-800/60 text-zinc-300')}>
                  <p className="text-sm">{msg.text || msg.body || msg.content}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{formatRelativeTime(msg.timestamp || msg.createdAt)}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-sm text-zinc-600 mt-12">No messages in this thread.</p>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800/40">
              <div className="flex gap-2">
                <input type="text" placeholder="Type a reply..." className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50" />
                <button className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium flex items-center gap-2 transition-colors">
                  <Send className="w-4 h-4" />Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<MessageCircle className="w-8 h-8" />} title="Select a conversation" description="Choose a thread from the left to view messages." />
          </div>
        )}
      </div>
    </div>
  )
}
