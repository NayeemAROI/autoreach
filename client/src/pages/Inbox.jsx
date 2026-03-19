import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../utils/api'
import { 
  MessageSquare, Send, ChevronLeft, Search, 
  User, Clock, Circle, Inbox as InboxIcon, RefreshCw 
} from 'lucide-react'

export default function InboxPage() {
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const messagesEndRef = useRef(null)

  const loadConversations = () => {
    apiFetch('/api/inbox').then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadConversations() }, [])

  const triggerSync = async () => {
    setSyncing(true)
    try {
      const res = await apiFetch('/api/inbox/trigger-sync', { method: 'POST' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.warn('Sync failed:', errData.error || res.statusText)
        // Don't crash — just stop syncing
        setSyncing(false)
        return
      }
      const data = await res.json()
      // Wait a few seconds for messages to come in, then reload
      setTimeout(() => {
        loadConversations()
        setSyncing(false)
      }, 5000)
    } catch (err) {
      console.error(err)
      setSyncing(false)
    }
  }

  const openThread = async (conv) => {
    setActiveConv(conv)
    const res = await apiFetch(`/api/inbox/${conv.id}`)
    const data = await res.json()
    setMessages(data.messages || [])
    // Update unread count locally
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendReply = async () => {
    if (!reply.trim() || !activeConv || sending) return
    setSending(true)
    try {
      const res = await apiFetch(`/api/inbox/${activeConv.id}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply })
      })
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
      setReply('')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) { console.error(err) }
    setSending(false)
  }

  const filtered = conversations.filter(c => 
    (c.participantName || c.firstName || '').toLowerCase().includes(search.toLowerCase())
  )

  const getDisplayName = (c) => {
    if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`
    return c.participantName || 'Unknown'
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-0 overflow-hidden">
      {/* Conversation List */}
      <div className={`w-[340px] flex-shrink-0 border-r border-border flex flex-col bg-bg-secondary ${activeConv ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Inbox
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerSync} disabled={syncing}
                className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Sync messages from LinkedIn"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              <span className="text-xs text-text-muted">{conversations.length} threads</span>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text" placeholder="Search conversations..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
              <InboxIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Messages will appear here when synced from LinkedIn</p>
            </div>
          ) : (
            filtered.map(conv => (
              <div
                key={conv.id}
                onClick={() => openThread(conv)}
                className={`px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-bg-primary/50 ${activeConv?.id === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>
                        {getDisplayName(conv)}
                      </span>
                      <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    {conv.company && <p className="text-[10px] text-text-muted truncate">{conv.company}</p>}
                    <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-text-primary' : 'text-text-muted'}`}>
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className={`flex-1 flex flex-col ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a thread from the list to view messages</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-bg-secondary">
              <button onClick={() => setActiveConv(null)} className="md:hidden text-text-muted hover:text-text-primary">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{getDisplayName(activeConv)}</p>
                {activeConv.company && <p className="text-[10px] text-text-muted">{activeConv.company}</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">No messages in this thread</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-start' : 'items-end'}`}>
                    <span className={`text-[10px] font-medium mb-1 px-1 ${
                      msg.direction === 'outbound' ? 'text-primary/70' : 'text-accent/70'
                    }`}>
                      {msg.direction === 'outbound' ? 'You' : (msg.senderName || getDisplayName(activeConv))}
                    </span>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.direction === 'outbound' 
                        ? 'bg-primary text-white rounded-bl-md' 
                        : 'bg-bg-secondary border border-border text-text-primary rounded-br-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/60' : 'text-text-muted'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-border bg-bg-secondary">
              <div className="flex items-center gap-2">
                <input
                  type="text" placeholder="Type a message..."
                  value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
