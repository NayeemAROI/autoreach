import { useState, useEffect } from 'react'
import {
  Settings, Linkedin, Trash2, ShieldCheck, ShieldAlert, Save, Users, Calendar, Globe
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function WorkspaceSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const wsId = user?.activeWorkspaceId
  const [ws, setWs] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!wsId) return
    apiFetch(`/api/workspaces/${wsId}/settings`)
      .then(r => r.json())
      .then(data => {
        setWs(data.workspace)
        setIsOwner(data.isOwner)
        setName(data.workspace?.name || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [wsId])

  const handleSave = async () => {
    if (!name.trim()) return showToast('Name cannot be empty', 'error')
    setSaving(true)
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })
      if (res.ok) showToast('Workspace updated')
      else showToast('Failed', 'error')
    } catch { showToast('Error', 'error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (deleteConfirm !== ws?.name) return
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showToast('Workspace deleted')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error', 'error') }
    setShowDelete(false)
    setDeleteConfirm('')
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="glass-card h-16 shimmer"></div>
      <div className="glass-card h-64 shimmer"></div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in ${
          toast.type === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'
        }`}>
          {toast.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Workspace Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your workspace configuration</p>
      </div>

      {/* General */}
      <section className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">General</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Workspace Name</label>
            <input className="input max-w-md" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-3 rounded-xl bg-bg-secondary border border-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Created</div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                {ws?.createdAt ? new Date(ws.createdAt).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-bg-secondary border border-border">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Members</div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-text-muted" />
                {ws?.memberCount || 1}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {/* LinkedIn */}
      <section className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">LinkedIn Connection</h2>
        </div>

        <div className="p-4 rounded-xl bg-bg-secondary border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${ws?.linkedinConnected ? 'bg-success' : 'bg-text-muted/40'}`}></div>
                <span className="text-sm font-semibold text-text-primary">
                  {ws?.linkedinConnected ? ws.linkedinProfileName : 'Not Connected'}
                </span>
              </div>
              {ws?.linkedinConnected && (
                <p className="text-xs text-text-muted ml-4.5">
                  Connected {ws.linkedinConnectedAt ? new Date(ws.linkedinConnectedAt).toLocaleDateString() : ''}
                  {ws.linkedinProfileUrl && <> · <a href={ws.linkedinProfileUrl} target="_blank" className="text-primary hover:underline">View Profile</a></>}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/integrations')}
              className="btn text-xs"
            >
              {ws?.linkedinConnected ? 'Manage' : 'Connect'}
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone (Owner Only) */}
      {isOwner && (
        <section className="glass-card p-6 border-danger/20 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Danger Zone</h2>
              <p className="text-xs text-text-muted">Irreversible actions</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-danger/20 bg-danger/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">Delete Workspace</div>
                <p className="text-xs text-text-muted mt-0.5">Permanently delete this workspace and all its data. This cannot be undone.</p>
              </div>
              <button onClick={() => setShowDelete(true)} className="btn bg-danger/20 text-danger border-danger/30 hover:bg-danger/30 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowDelete(false)}>
          <div className="bg-bg-elevated border border-border rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-danger mb-2">Delete Workspace</h3>
            <p className="text-sm text-text-muted mb-4">
              This will permanently delete <strong className="text-text-primary">{ws?.name}</strong> and all associated data including leads, campaigns, conversations, and logs.
            </p>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Type <strong className="text-danger">{ws?.name}</strong> to confirm
              </label>
              <input className="input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={ws?.name} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn" onClick={() => { setShowDelete(false); setDeleteConfirm('') }}>Cancel</button>
              <button className="btn bg-danger text-white hover:bg-danger/90" onClick={handleDelete} disabled={deleteConfirm !== ws?.name}>
                <Trash2 className="w-4 h-4" /> Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
