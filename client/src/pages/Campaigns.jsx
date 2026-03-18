import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket, Plus, Play, Pause, Square, Settings,
  MessageSquare, Mail, Users, ArrowRight,
  MoreVertical, Activity, X, Workflow, Trash2,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { apiFetch } from '../utils/api'

const typeIcons = {
  'linkedin': { icon: MessageSquare, color: 'text-info', bg: 'bg-info/10' },
  'email': { icon: Mail, color: 'text-accent-light', bg: 'bg-accent/10' },
  'multi-channel': { icon: Rocket, color: 'text-primary-light', bg: 'bg-primary/10' },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('linkedin')
  const [creating, setCreating] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null })
  const navigate = useNavigate()

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      await apiFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      fetchCampaigns()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await apiFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), type: newType })
      })
      const data = await res.json()
      setShowCreate(false)
      setNewName('')
      setNewType('linkedin')
      // Navigate directly to the builder
      navigate(`/campaigns/${data.id}/builder`)
    } catch (err) {
      console.error(err)
      showToast('Failed to create campaign', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Campaign',
      message: 'Are you sure you want to delete this campaign? This action cannot be undone and will remove all associated leads and activities.',
      action: async () => {
        try {
          await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' })
          fetchCampaigns()
          showToast('Campaign deleted successfully')
        } catch (err) {
          console.error(err)
          showToast('Failed to delete campaign', 'error')
        }
      }
    })
  }

  const handleDuplicate = async (id) => {
    try {
      await apiFetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' })
      fetchCampaigns()
      showToast('Campaign duplicated')
    } catch (err) {
      console.error(err)
      showToast('Failed to duplicate', 'error')
    }
  }

  const getStepCount = (camp) => {
    if (camp.sequence && typeof camp.sequence === 'object' && camp.sequence.nodes) {
      return Object.keys(camp.sequence.nodes).length - 1
    }
    if (Array.isArray(camp.sequence)) return camp.sequence.length
    return 0
  }

  const getLeadCount = (camp) => {
    const ids = camp.leadIds
    return Array.isArray(ids) ? ids.length : 0
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Campaigns</h1>
          <p className="text-sm text-text-muted mt-1">Build and manage multi-channel outreach sequences</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="glass-card h-64 shimmer"></div>)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card p-16 text-center hover:transform-none">
          <Rocket className="w-12 h-12 mx-auto text-text-muted opacity-20 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No campaigns yet</h3>
          <p className="text-sm text-text-muted mb-6">Create your first outreach campaign to start automating</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map((camp, index) => {
            const Config = typeIcons[camp.type] || typeIcons.linkedin
            const TypeIcon = Config.icon
            const total = camp.stats?.sent || 1
            const acceptRate = Math.round(((camp.stats?.accepted || 0) / total) * 100)
            const replyRate = Math.round(((camp.stats?.replied || 0) / total) * 100)
            const stepCount = getStepCount(camp)
            const leadCount = getLeadCount(camp)

            return (
              <div key={camp.id} className={`glass-card p-5 animate-fade-in animate-fade-in-delay-${(index%4)+1} flex flex-col`}>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${Config.bg} flex items-center justify-center shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${Config.color}`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-text-primary leading-tight truncate max-w-[180px]" title={camp.name}>
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-text-muted capitalize">{camp.type}</span>
                        <div className="w-1 h-1 rounded-full bg-border-light"></div>
                        <span className="text-[11px] text-text-muted">{stepCount} steps</span>
                        <div className="w-1 h-1 rounded-full bg-border-light"></div>
                        <span className="text-[11px] text-text-muted"><Users className="w-3 h-3 inline -mt-0.5 mr-0.5" />{leadCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDuplicate(camp.id)}
                      className="p-1.5 text-text-muted hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors"
                      title="Duplicate">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    </button>
                    <button onClick={() => handleDelete(camp.id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-5">
                  <span className={`badge ${
                    camp.status === 'active' ? 'badge-success' : 
                    camp.status === 'paused' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {camp.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-success pulse-dot mr-1.5 -ml-0.5"></div>}
                    {camp.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-bg-secondary rounded-lg p-2 border border-border/50">
                    <div className="text-[10px] text-text-muted mb-0.5">Sent</div>
                    <div className="text-sm font-semibold text-text-primary">{camp.stats?.sent || 0}</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-2 border border-border/50">
                    <div className="text-[10px] text-text-muted mb-0.5">Accepted</div>
                    <div className="text-sm font-semibold text-success">{acceptRate}%</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-2 border border-border/50">
                    <div className="text-[10px] text-text-muted mb-0.5">Replied</div>
                    <div className="text-sm font-semibold text-primary">{replyRate}%</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                  <button
                    onClick={() => navigate(`/campaigns/${camp.id}/builder`)}
                    className="flex-1 btn btn-secondary btn-sm justify-center"
                  >
                    <Workflow className="w-3.5 h-3.5" /> Edit Sequence
                  </button>
                  <button 
                    onClick={() => toggleStatus(camp.id, camp.status)}
                    className={`btn btn-sm px-3 ${camp.status === 'active' ? 'btn-secondary text-warning' : 'btn-primary'}`}
                  >
                    {camp.status === 'active' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Create New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Q1 Product Launch Outreach"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Campaign Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(typeIcons).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={key}
                        onClick={() => setNewType(key)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          newType === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-border-light'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1.5 ${newType === key ? 'text-primary-light' : 'text-text-muted'}`} />
                        <div className={`text-xs font-medium capitalize ${newType === key ? 'text-primary-light' : 'text-text-secondary'}`}>
                          {key.replace('-', ' ')}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 btn btn-secondary justify-center">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 btn btn-primary justify-center disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create & Build Sequence'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-surface w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-text-primary mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="btn btn-secondary" 
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
              >
                Cancel
              </button>
              <button 
                className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white border-transparent"
                onClick={async () => {
                  if (confirmModal.action) await confirmModal.action()
                  setConfirmModal({ isOpen: false, title: '', message: '', action: null })
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${
            toastMsg.type === 'error' 
              ? 'bg-danger/10 border-danger/20 text-danger' 
              : 'bg-success/10 border-success/20 text-success'
          }`}>
            {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <p className="text-[14px] font-medium">{toastMsg.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
