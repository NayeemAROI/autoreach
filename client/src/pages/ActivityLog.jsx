import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'
import { 
  Activity, 
  LogIn, LogOut, UserPlus, 
  Users, UserPlus2, Upload, Trash2,
  Rocket, Play, Pause, Settings,
  Plug, PlugZap, RefreshCw,
  Briefcase, ArrowRightLeft,
  Filter, ChevronDown, Calendar, Search, ChevronLeft, ChevronRight,
  Shield, KeyRound, Mail
} from 'lucide-react'

const ACTION_META = {
  'auth.login':                  { icon: LogIn,        label: 'Logged in',                  color: '#22c55e', category: 'Auth' },
  'auth.register':               { icon: UserPlus,     label: 'Account registered',         color: '#3b82f6', category: 'Auth' },
  'auth.email_verified':         { icon: Mail,         label: 'Email verified',             color: '#22c55e', category: 'Auth' },
  'auth.password_reset':         { icon: KeyRound,     label: 'Password reset',             color: '#f59e0b', category: 'Auth' },
  'lead.created':                { icon: UserPlus2,    label: 'Lead created',               color: '#8b5cf6', category: 'Leads' },
  'lead.bulk_import':            { icon: Upload,       label: 'Leads imported',             color: '#8b5cf6', category: 'Leads' },
  'lead.deleted':                { icon: Trash2,       label: 'Lead deleted',               color: '#ef4444', category: 'Leads' },
  'campaign.created':            { icon: Rocket,       label: 'Campaign created',           color: '#06b6d4', category: 'Campaigns' },
  'campaign.updated':            { icon: Settings,     label: 'Campaign updated',           color: '#06b6d4', category: 'Campaigns' },
  'campaign.deleted':            { icon: Trash2,       label: 'Campaign deleted',           color: '#ef4444', category: 'Campaigns' },
  'campaign.leads_enrolled':     { icon: Users,        label: 'Leads enrolled',             color: '#06b6d4', category: 'Campaigns' },
  'campaign.started':            { icon: Play,         label: 'Campaign started',           color: '#22c55e', category: 'Campaigns' },
  'campaign.paused':             { icon: Pause,        label: 'Campaign paused',            color: '#f59e0b', category: 'Campaigns' },
  'workspace.created':           { icon: Briefcase,    label: 'Workspace created',          color: '#a855f7', category: 'Workspace' },
  'workspace.updated':           { icon: Settings,     label: 'Workspace updated',          color: '#a855f7', category: 'Workspace' },
  'workspace.deleted':           { icon: Trash2,       label: 'Workspace deleted',          color: '#ef4444', category: 'Workspace' },
  'workspace.switched':          { icon: ArrowRightLeft,label: 'Workspace switched',        color: '#a855f7', category: 'Workspace' },
  'workspace.linkedin_connected':    { icon: PlugZap,  label: 'LinkedIn connected',         color: '#22c55e', category: 'Integration' },
  'workspace.linkedin_disconnected': { icon: Plug,     label: 'LinkedIn disconnected',      color: '#ef4444', category: 'Integration' },
  'integration.linkedin_connected':  { icon: PlugZap,  label: 'LinkedIn connected',         color: '#22c55e', category: 'Integration' },
  'integration.linkedin_disconnected':{ icon: Plug,    label: 'LinkedIn disconnected',      color: '#ef4444', category: 'Integration' },
  'integration.inbox_synced':    { icon: RefreshCw,    label: 'Inbox synced',               color: '#3b82f6', category: 'Integration' },
}

const CATEGORIES = ['All', 'Auth', 'Leads', 'Campaigns', 'Workspace', 'Integration']

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'Z')
  const now = new Date()
  const diff = (now - d) / 1000

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLog({ isAdminView = false }) {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [category, setCategory] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [page, category])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit, offset: page * limit })
      if (category !== 'All') {
        // Map category to action prefix
        const prefixMap = { Auth: 'auth', Leads: 'lead', Campaigns: 'campaign', Workspace: 'workspace', Integration: 'integration' }
        params.set('action', prefixMap[category] || '')
      }
      
      const endpoint = isAdminView ? `/api/admin/audit-log?${params}` : `/api/audit-log?${params}`
      const res = await apiFetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Failed to fetch audit logs:', e)
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className={isAdminView ? "w-full" : "p-8 max-w-5xl mx-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${isAdminView ? 'text-xl' : 'text-2xl'} font-bold text-text-primary flex items-center gap-3`}>
            <Activity className={`${isAdminView ? 'w-6 h-6 text-amber-500' : 'w-7 h-7 text-primary'}`} />
            {isAdminView ? 'Global Activity Log' : 'Activity Log'}
          </h1>
          <p className="text-sm text-text-muted mt-1">{total} events tracked system-wide</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all
            ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bg-elevated border-border text-text-secondary hover:border-primary/30'}`}
        >
          <Filter className="w-4 h-4" />
          Filter
          {category !== 'All' && <span className="w-5 h-5 bg-primary text-white rounded-full text-[10px] flex items-center justify-center font-bold">1</span>}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card p-4 mb-6 flex flex-wrap gap-2 animate-fade-in">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${category === cat 
                  ? 'bg-primary text-white' 
                  : 'bg-bg-surface text-text-muted hover:text-text-primary hover:bg-bg-hover border border-border'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Activity className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No activity logs yet</p>
          </div>
        ) : (
          logs.map((log, i) => {
            const meta = ACTION_META[log.action] || { icon: Activity, label: log.action, color: '#6b7280', category: 'Other' }
            const Icon = meta.icon
            const details = log.details || {}
            
            return (
              <div key={log.id} className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-bg-surface/50 transition-colors">
                {/* Icon */}
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${meta.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{meta.label}</span>
                    {log.entity_name && (
                      <>
                        <span className="text-text-muted text-xs">—</span>
                        <span className="text-sm text-text-secondary truncate">{log.entity_name}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Detail chips */}
                  {Object.keys(details).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(details).map(([k, v]) => (
                        <span key={k} className="text-[10px] px-2 py-0.5 rounded-md bg-bg-elevated text-text-muted border border-border/50">
                          {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time + User */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted">{formatTime(log.created_at)}</p>
                  {(log.userName || isAdminView) && (
                    <p className="text-[10px] text-text-muted/60 mt-0.5" title={log.userEmail}>{log.userName || 'System/Unknown'}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-text-muted">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-bg-elevated border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
