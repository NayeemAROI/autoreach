import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, Copy, Trash2, Settings, Users, BarChart3,
  Activity, Workflow, Clock, CheckCircle2, AlertCircle, XCircle,
  Search, Filter, ChevronLeft, ChevronRight, Rocket, UserPlus,
  Eye, MessageSquare, ThumbsUp, Award, MessageCircle, RefreshCw,
  Calendar, Globe, Zap, Save, X, MoreVertical, Archive
} from 'lucide-react'
import { apiFetch } from '../utils/api'

// ─── Status colors ───────────────────────────────────────────────
const STATUS_STYLES = {
  draft:     { bg: 'rgba(100,116,139,.12)', color: '#94a3b8', label: 'Draft' },
  active:    { bg: 'rgba(16,185,129,.12)',  color: '#10b981', label: 'Active' },
  paused:    { bg: 'rgba(245,158,11,.12)',  color: '#f59e0b', label: 'Paused' },
  completed: { bg: 'rgba(99,102,241,.12)',  color: '#6366f1', label: 'Completed' },
  archived:  { bg: 'rgba(107,114,128,.12)', color: '#6b7280', label: 'Archived' },
}

const STEP_ICONS = {
  start: Rocket, send_invite: UserPlus, view_profile: Eye,
  like_post: ThumbsUp, endorse: Award, comment: MessageCircle,
  send_message: MessageSquare, delay: Clock, end: XCircle,
}

const TABS = [
  { key: 'overview',  icon: BarChart3, label: 'Overview' },
  { key: 'leads',     icon: Users,     label: 'Leads' },
  { key: 'workflow',  icon: Workflow,  label: 'Workflow' },
  { key: 'logs',      icon: Activity,  label: 'Logs' },
  { key: 'settings',  icon: Settings,  label: 'Settings' },
]

// ─── Toast helper ────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
        toast.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'
      }`}>
        {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        <p className="text-[14px] font-medium">{toast.text}</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export default function CampaignDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [campaign, setCampaign] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [leads, setLeads] = useState([])
  const [logs, setLogs] = useState([])
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, totalPages: 0 })
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [confirmModal, setConfirmModal] = useState(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [leadFilter, setLeadFilter] = useState('all')
  const [logFilter, setLogFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({})

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // ─── Load Data ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/campaigns/${id}`)
        const data = await res.json()
        setCampaign(data)
        setSettingsForm({
          name: data.name || '',
          schedule: data.schedule || { days: ['mon','tue','wed','thu','fri'], startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
        })
      } catch { showToast('Failed to load campaign', 'error') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!campaign) return
    if (activeTab === 'overview') loadAnalytics()
    if (activeTab === 'leads') loadLeads()
    if (activeTab === 'logs') loadLogs()
    if (activeTab === 'workflow') loadPipeline()
  }, [activeTab, campaign])

  const loadAnalytics = async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/analytics`)
      setAnalytics(await res.json())
    } catch {}
  }

  const loadLeads = async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/leads`)
      const data = await res.json()
      setLeads(data.leads || [])
    } catch {}
  }

  const loadPipeline = async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/pipeline`)
      const data = await res.json()
      setPipeline(data.pipeline || [])
    } catch {}
  }

  const loadLogs = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 30 })
      if (logFilter !== 'all') params.set('result', logFilter)
      const res = await apiFetch(`/api/campaigns/${id}/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setLogsMeta({ total: data.total, page: data.page, totalPages: data.totalPages })
    } catch {}
  }

  // ─── Actions ─────────────────────────────────────────────────
  const pauseCampaign = async () => {
    try {
      await apiFetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
      setCampaign(p => ({ ...p, status: 'paused' }))
      showToast('Campaign paused')
    } catch { showToast('Failed to pause', 'error') }
  }

  const resumeCampaign = async () => {
    try {
      await apiFetch(`/api/campaigns/${id}/resume`, { method: 'POST' })
      setCampaign(p => ({ ...p, status: 'active' }))
      showToast('Campaign activated')
    } catch { showToast('Failed to resume', 'error') }
  }

  const duplicateCampaign = async () => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      showToast('Campaign duplicated')
      navigate(`/campaigns/${data.id}`)
    } catch { showToast('Failed to duplicate', 'error') }
  }

  const deleteCampaign = () => {
    setConfirmModal({
      title: 'Delete Campaign',
      message: 'Are you sure? This will permanently remove the campaign and all associated data.',
      action: async () => {
        try {
          await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' })
          showToast('Campaign deleted')
          navigate('/campaigns')
        } catch { showToast('Failed to delete', 'error') }
      }
    })
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      })
      const data = await res.json()
      setCampaign(data)
      showToast('Settings saved')
    } catch { showToast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const retryFailed = async (resetAll = false) => {
    try {
      const res = await apiFetch(`/api/campaigns/${id}/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAll })
      })
      const data = await res.json()
      showToast(data.message || 'Leads retried')
      if (activeTab === 'overview') loadAnalytics()
      if (activeTab === 'leads') loadLeads()
      if (activeTab === 'logs') loadLogs()
      if (activeTab === 'workflow') loadPipeline()
    } catch { showToast('Failed to retry', 'error') }
  }

  // ─── Derived data ────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let result = leads
    if (leadSearch) {
      const q = leadSearch.toLowerCase()
      result = result.filter(l =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q)
      )
    }
    if (leadFilter !== 'all') {
      result = result.filter(l => l.verification_status === leadFilter)
    }
    return result
  }, [leads, leadSearch, leadFilter])

  const stepNodes = useMemo(() => {
    if (!campaign?.sequence?.nodes) return []
    const nodes = campaign.sequence.nodes
    const result = []
    const visit = (nodeId, depth = 0) => {
      if (!nodeId || !nodes[nodeId]) return
      const node = nodes[nodeId]
      result.push({ ...node, depth })
      if (node.yesChild) visit(node.yesChild, depth + 1)
      if (node.noChild) visit(node.noChild, depth + 1)
    }
    visit(campaign.sequence.rootId)
    return result
  }, [campaign])

  // ─── Loading state ───────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Loading campaign...</p>
      </div>
    </div>
  )

  if (!campaign) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <AlertCircle className="w-12 h-12 text-text-muted opacity-30" />
      <p className="text-text-muted font-medium">Campaign not found</p>
      <button onClick={() => navigate('/campaigns')} className="btn btn-secondary">← Back to Campaigns</button>
    </div>
  )

  const status = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft
  const stats = campaign.stats || {}

  return (
    <div className="space-y-6 w-full">
      <Toast toast={toast} />

      {/* ─── HEADER ─── */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/campaigns')}
              className="w-10 h-10 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-text-primary">{campaign.name}</h1>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: status.bg, color: status.color }}>
                  {campaign.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />}
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-text-muted">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                <span className="capitalize flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {campaign.type}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {campaign.status === 'active' ? (
              <button onClick={pauseCampaign} className="btn btn-sm bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button onClick={resumeCampaign} className="btn btn-sm bg-success/10 text-success border-success/20 hover:bg-success/20">
                <Play className="w-3.5 h-3.5" /> {campaign.status === 'draft' ? 'Activate' : 'Resume'}
              </button>
            )}
            <button onClick={() => navigate(`/campaigns/${id}/builder`)} className="btn btn-sm btn-secondary">
              <Workflow className="w-3.5 h-3.5" /> Edit Sequence
            </button>
            <button onClick={() => retryFailed(false)} className="btn btn-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <RefreshCw className="w-3.5 h-3.5" /> Retry Failed
            </button>
            <button onClick={() => retryFailed(true)} className="btn btn-sm bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" title="Reset all leads back to step 1">
              <Archive className="w-3.5 h-3.5" /> Reset All
            </button>
            <button onClick={duplicateCampaign} className="btn btn-sm btn-secondary">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button onClick={deleteCampaign} className="btn btn-sm bg-danger/10 text-danger border-danger/20 hover:bg-danger/20">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-t border-border/50">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Leads', value: analytics?.pipeline?.total || (campaign.leadIds?.length || 0), icon: Users, color: '#6366f1' },
              { label: 'Active', value: analytics?.pipeline?.active || 0, icon: Play, color: '#10b981' },
              { label: 'Completed', value: analytics?.pipeline?.completed || 0, icon: CheckCircle2, color: '#8b5cf6' },
              { label: 'Acceptance Rate', value: `${analytics?.rates?.acceptance || 0}%`, icon: UserPlus, color: '#06b6d4' },
              { label: 'Reply Rate', value: `${analytics?.rates?.reply || 0}%`, icon: MessageSquare, color: '#f59e0b' },
            ].map((m, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}15` }}>
                    <m.icon className="w-4 h-4" style={{ color: m.color }} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-text-primary">{m.value}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Campaign Stats
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Invitations Sent', value: stats.sent || 0, color: '#6366f1' },
                  { label: 'Accepted', value: stats.accepted || 0, color: '#10b981' },
                  { label: 'Messages Replied', value: stats.replied || 0, color: '#06b6d4' },
                  { label: 'Bounced', value: stats.bounced || 0, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-sm text-text-secondary">{s.label}</span>
                    </div>
                    <span className="text-sm font-bold text-text-primary">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Pipeline Status
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Pending', value: analytics?.pipeline?.pending || 0, color: '#94a3b8' },
                  { label: 'Active', value: analytics?.pipeline?.active || 0, color: '#10b981' },
                  { label: 'Completed', value: analytics?.pipeline?.completed || 0, color: '#6366f1' },
                  { label: 'Errors', value: analytics?.pipeline?.error || 0, color: '#ef4444' },
                  { label: 'Paused', value: analytics?.pipeline?.paused || 0, color: '#f59e0b' },
                ].map((s, i) => {
                  const total = analytics?.pipeline?.total || 1
                  const pct = Math.round((s.value / total) * 100)
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">{s.label}</span>
                        <span className="text-xs font-bold text-text-primary">{s.value} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === 'leads' && (
        <div className="glass-card p-0 overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50">
            <div>
              <h3 className="text-base font-bold text-text-primary">Enrolled Leads</h3>
              <p className="text-xs text-text-muted mt-0.5">{filteredLeads.length} of {leads.length} leads</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Search leads..." value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  className="input pl-9 py-2 text-xs w-52" />
              </div>
              <select value={leadFilter} onChange={e => setLeadFilter(e.target.value)}
                className="input py-2 text-xs w-36">
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto text-text-muted opacity-20 mb-3" />
              <p className="text-sm font-medium text-text-muted">No leads {leads.length > 0 ? 'match your search' : 'enrolled yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-text-muted bg-bg-secondary/50">
                    <th className="text-left px-5 py-3">Lead</th>
                    <th className="text-left px-5 py-3">Company</th>
                    <th className="text-left px-5 py-3">Title</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="border-t border-border/30 hover:bg-bg-hover/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{lead.firstName} {lead.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary">{lead.company || '—'}</td>
                      <td className="px-5 py-3 text-sm text-text-secondary truncate max-w-[200px]">{lead.title || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${lead.verification_status === 'verified' ? 'badge-success' : 'badge-info'}`}>
                          {lead.verification_status || 'unverified'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {lead.linkedinUrl ? (
                          <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline">View Profile</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WORKFLOW TAB */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary">Campaign Sequence</h3>
              <p className="text-xs text-text-muted mt-0.5">{stepNodes.length} steps · Click "Edit Sequence" to modify</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadPipeline} className="btn btn-sm btn-secondary">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button onClick={() => navigate(`/campaigns/${id}/builder`)} className="btn btn-sm btn-primary">
                <Workflow className="w-3.5 h-3.5" /> Edit Sequence
              </button>
            </div>
          </div>

          {/* Step Timeline */}
          {stepNodes.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Workflow className="w-10 h-10 mx-auto text-text-muted opacity-20 mb-3" />
              <p className="text-sm font-medium text-text-muted">No sequence configured yet</p>
              <button onClick={() => navigate(`/campaigns/${id}/builder`)} className="btn btn-primary mt-4">
                <Zap className="w-4 h-4" /> Build Sequence
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {stepNodes.map((node, i) => {
                const Icon = STEP_ICONS[node.type] || Zap
                const pipelineAtStep = pipeline.filter(p => p.current_node_id === node.id)
                return (
                  <div key={node.id} className="flex items-stretch gap-4">
                    {/* Timeline rail */}
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        node.type === 'start' ? 'bg-primary/10 border-primary/20' :
                        node.type === 'delay' ? 'bg-bg-secondary border-border' :
                        node.type === 'end' ? 'bg-danger/10 border-danger/20' :
                        'bg-bg-elevated border-border/60'
                      }`}>
                        <Icon className="w-4 h-4 text-text-secondary" />
                      </div>
                      {i < stepNodes.length - 1 && <div className="w-0.5 flex-1 bg-border/40 min-h-[20px]" />}
                    </div>

                    {/* Step content */}
                    <div className="glass-card p-4 flex-1 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5">
                            Step {i + 1} · {node.type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-bold text-text-primary">
                            {node.type === 'delay' && node.config?.days ? `Wait ${node.config.days} day${node.config.days !== 1 ? 's' : ''}` :
                             node.type === 'send_message' && node.config?.message ? `"${node.config.message.substring(0, 60)}..."` :
                             node.type === 'send_invite' && node.config?.note ? `Note: "${node.config.note.substring(0, 60)}..."` :
                             node.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                        {pipelineAtStep.length > 0 && (
                          <span className="badge badge-info text-[10px]">{pipelineAtStep.length} leads here</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="glass-card p-0 overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50">
            <div>
              <h3 className="text-base font-bold text-text-primary">Execution Logs</h3>
              <p className="text-xs text-text-muted mt-0.5">{logsMeta.total} log entries</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={logFilter} onChange={e => { setLogFilter(e.target.value); loadLogs(1) }}
                className="input py-2 text-xs w-36">
                <option value="all">All Results</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <button onClick={() => loadLogs(logsMeta.page)} className="btn btn-sm btn-secondary">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-10 h-10 mx-auto text-text-muted opacity-20 mb-3" />
              <p className="text-sm font-medium text-text-muted">No execution logs yet</p>
              <p className="text-xs text-text-muted mt-1">Logs will appear when the campaign starts executing actions</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-text-muted bg-bg-secondary/50">
                      <th className="text-left px-5 py-3">Time</th>
                      <th className="text-left px-5 py-3">Lead</th>
                      <th className="text-left px-5 py-3">Action</th>
                      <th className="text-left px-5 py-3">Result</th>
                      <th className="text-left px-5 py-3">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-t border-border/30 hover:bg-bg-hover/30 transition-colors">
                        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-sm text-text-primary">
                          {log.firstName ? `${log.firstName} ${log.lastName}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-medium text-text-secondary">{log.action_type?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`badge text-[10px] ${
                            log.result === 'success' ? 'badge-success' :
                            log.result === 'failed' ? 'badge-danger' : 'badge-warning'
                          }`}>{log.result}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-danger max-w-[200px] truncate">{log.error_message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsMeta.totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-border/50">
                  <span className="text-xs text-text-muted">Page {logsMeta.page} of {logsMeta.totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => loadLogs(logsMeta.page - 1)} disabled={logsMeta.page <= 1}
                      className="btn btn-sm btn-secondary disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => loadLogs(logsMeta.page + 1)} disabled={logsMeta.page >= logsMeta.totalPages}
                      className="btn btn-sm btn-secondary disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="glass-card p-6 max-w-2xl">
          <h3 className="text-base font-bold text-text-primary mb-6 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Campaign Settings
          </h3>

          <div className="space-y-5">
            {/* Campaign Name */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Campaign Name</label>
              <input type="text" className="input" value={settingsForm.name}
                onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            {/* Schedule */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-3">Working Hours</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Start Time</label>
                  <input type="time" className="input" value={settingsForm.schedule?.startTime || '09:00'}
                    onChange={e => setSettingsForm(p => ({ ...p, schedule: { ...p.schedule, startTime: e.target.value } }))} />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">End Time</label>
                  <input type="time" className="input" value={settingsForm.schedule?.endTime || '17:00'}
                    onChange={e => setSettingsForm(p => ({ ...p, schedule: { ...p.schedule, endTime: e.target.value } }))} />
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-3">Active Days</label>
              <div className="flex gap-2">
                {['mon','tue','wed','thu','fri','sat','sun'].map(day => {
                  const active = settingsForm.schedule?.days?.includes(day)
                  return (
                    <button key={day} onClick={() => {
                      const days = settingsForm.schedule?.days || []
                      const updated = active ? days.filter(d => d !== day) : [...days, day]
                      setSettingsForm(p => ({ ...p, schedule: { ...p.schedule, days: updated } }))
                    }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                        active ? 'bg-primary/10 text-primary border-primary/20' : 'bg-bg-secondary text-text-muted border-border hover:border-border-light'
                      }`}>
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Timezone</label>
              <select className="input" value={settingsForm.schedule?.timezone || 'UTC'}
                onChange={e => setSettingsForm(p => ({ ...p, schedule: { ...p.schedule, timezone: e.target.value } }))}>
                <option value="UTC">UTC</option>
                <option value="UTC+6">UTC+6 (Bangladesh)</option>
                <option value="America/New_York">Eastern (US)</option>
                <option value="America/Los_Angeles">Pacific (US)</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Kolkata">India</option>
              </select>
            </div>

            <div className="pt-4 border-t border-border/50">
              <button onClick={saveSettings} disabled={saving} className="btn btn-primary disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold text-text-primary mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border-transparent"
                onClick={async () => { await confirmModal.action(); setConfirmModal(null) }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
