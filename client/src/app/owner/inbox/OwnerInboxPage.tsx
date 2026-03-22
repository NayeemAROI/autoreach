import { useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { mockInboxThreads, mockInboxThread } from '@/data/mock'
import { sentimentBadge } from '@/lib/utils'
import { Send, MoreVertical, Archive, Tag, ExternalLink } from 'lucide-react'

export default function OwnerInboxPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(mockInboxThreads[0]?.id || '')
  const [reply, setReply] = useState('')

  const threads = mockInboxThreads.filter(t =>
    !search || t.leadName.toLowerCase().includes(search.toLowerCase()) || t.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  const activeThread = mockInboxThread // Use detailed thread for the selected conversation

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
      {/* Thread List */}
      <div className="w-80 border-r border-zinc-800/60 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800/40">
          <SearchInput value={search} onChange={setSearch} placeholder="Search messages..." />
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                'w-full text-left px-4 py-3.5 border-b border-zinc-800/30 transition-colors',
                selectedId === t.id ? 'bg-zinc-800/50' : 'hover:bg-zinc-900',
                t.unread && 'border-l-2 border-l-violet-500'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-sm font-medium truncate', t.unread ? 'text-white' : 'text-zinc-300')}>{t.leadName}</span>
                <span className="text-[10px] text-zinc-600 shrink-0">{formatRelativeTime(t.lastMessageAt)}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 truncate">{t.lastMessage}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {t.sentiment && <StatusBadge label={sentimentBadge(t.sentiment).label} variant={sentimentBadge(t.sentiment).variant} dot={false} className="text-[9px] px-1.5 py-0.5" />}
                {t.campaignName && <span className="text-[9px] text-zinc-600 truncate">{t.campaignName}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-3.5 border-b border-zinc-800/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">{activeThread.lead.firstName} {activeThread.lead.lastName}</h3>
            <p className="text-[11px] text-zinc-500">{activeThread.lead.title} at {activeThread.lead.company}</p>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><Archive className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><Tag className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><ExternalLink className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeThread.messages.map(msg => (
            <div key={msg.id} className={cn('flex', msg.direction === 'out' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3',
                msg.direction === 'out' ? 'bg-violet-600/20 border border-violet-500/20 text-zinc-200' : 'bg-zinc-800/60 border border-zinc-700/30 text-zinc-300'
              )}>
                <p className="text-sm">{msg.content}</p>
                <p className="text-[10px] text-zinc-600 mt-1.5">{formatRelativeTime(msg.sentAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-zinc-800/40">
          <div className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="w-72 border-l border-zinc-800/60 p-4 hidden xl:block overflow-y-auto">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Lead Info</h4>
        <div className="space-y-2 text-sm">
          <div><span className="text-zinc-500">Name</span><p className="text-zinc-300">{activeThread.lead.firstName} {activeThread.lead.lastName}</p></div>
          <div><span className="text-zinc-500">Title</span><p className="text-zinc-300">{activeThread.lead.title}</p></div>
          <div><span className="text-zinc-500">Company</span><p className="text-zinc-300">{activeThread.lead.company}</p></div>
          {activeThread.lead.email && <div><span className="text-zinc-500">Email</span><p className="text-zinc-300">{activeThread.lead.email}</p></div>}
          {activeThread.campaignName && <div><span className="text-zinc-500">Campaign</span><p className="text-zinc-300">{activeThread.campaignName}</p></div>}
          {activeThread.sentiment && (
            <div><span className="text-zinc-500">Sentiment</span><div className="mt-1"><StatusBadge label={sentimentBadge(activeThread.sentiment).label} variant={sentimentBadge(activeThread.sentiment).variant} /></div></div>
          )}
        </div>
      </div>
    </div>
  )
}
