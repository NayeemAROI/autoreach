import { useState, useEffect, useMemo } from 'react'
import {
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert, Crown, Search, MoreVertical,
  Mail, Trash2, UserX, UserCheck, ChevronDown, X, Save
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
  owner: { label: 'Owner', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Crown },
  admin: { label: 'Admin', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Shield },
  member: { label: 'Member', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Users },
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-success' },
  deactivated: { label: 'Deactivated', color: 'text-danger' },
  invited: { label: 'Invited', color: 'text-warning' },
}

export default function WorkspaceMembers() {
  const { user } = useAuth()
  const wsId = user?.activeWorkspaceId
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [seats, setSeats] = useState({ used: 0, limit: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  // Modals
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const [showRoleModal, setShowRoleModal] = useState(null) // { userId, name, currentRole }
  const [newRole, setNewRole] = useState('member')

  const [confirmAction, setConfirmAction] = useState(null) // { type, userId, name }
  const [actionMenuOpen, setActionMenuOpen] = useState(null)

  const myRole = useMemo(() => {
    return members.find(m => m.id === user?.id)?.role || 'member'
  }, [members, user])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMembers = async () => {
    if (!wsId) return
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}/members`)
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
        setInvites(data.invites || [])
        setSeats(data.seats || { used: 0, limit: 1 })
      }
    } catch (err) {
      console.error('Error loading members:', err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [wsId])

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(m => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
  }, [members, search])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'Invited!')
        setInviteEmail(''); setShowInvite(false)
        fetchMembers()
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error inviting', 'error') }
    setInviting(false)
  }

  const handleRoleChange = async () => {
    if (!showRoleModal) return
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}/members/${showRoleModal.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Role changed to ${newRole}`)
        setShowRoleModal(null)
        fetchMembers()
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error', 'error') }
  }

  const handleStatusChange = async (userId, status) => {
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}/members/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'Updated')
        fetchMembers()
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error', 'error') }
    setConfirmAction(null)
  }

  const handleRemove = async (userId) => {
    try {
      const res = await apiFetch(`/api/workspaces/${wsId}/members/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showToast('Member removed')
        fetchMembers()
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error', 'error') }
    setConfirmAction(null)
  }

  const handleCancelInvite = async (inviteId) => {
    try {
      await apiFetch(`/api/workspaces/${wsId}/invites/${inviteId}`, { method: 'DELETE' })
      showToast('Invite cancelled')
      fetchMembers()
    } catch { showToast('Error', 'error') }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="glass-card h-16 shimmer"></div>
      <div className="glass-card h-64 shimmer"></div>
    </div>
  )

  return (
    <div className="space-y-6 relative">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team Members</h1>
          <p className="text-sm text-text-muted mt-1">Manage workspace members and invitations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Seat Usage */}
          <div className="px-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-xs font-bold text-text-secondary">
            <Users className="w-3.5 h-3.5 inline mr-1.5" />
            {seats.used}/{seats.limit} seats
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input className="input pl-10" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Members Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Member</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Role</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Joined</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Last Active</th>
              <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const rc = ROLE_CONFIG[m.role] || ROLE_CONFIG.member
              const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.active
              const initials = m.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
              const isMe = m.id === user?.id
              const canAction = !isMe && m.role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && m.role === 'member'))

              return (
                <tr key={m.id} className="border-b border-border/30 hover:bg-bg-surface/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{initials}</div>
                      <div>
                        <div className="font-semibold text-text-primary flex items-center gap-1.5">
                          {m.name} {isMe && <span className="text-[10px] text-text-muted">(you)</span>}
                        </div>
                        <div className="text-xs text-text-muted">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${rc.color}`}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${sc.color}`}>● {sc.label}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-muted">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3 text-xs text-text-muted">{m.last_login_at ? new Date(m.last_login_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    {canAction && (
                      <div className="relative">
                        <button onClick={() => setActionMenuOpen(actionMenuOpen === m.id ? null : m.id)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === m.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-bg-elevated border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-30 animate-fade-in">
                            {myRole === 'owner' && (
                              <button onClick={() => { setShowRoleModal({ userId: m.id, name: m.name, currentRole: m.role }); setNewRole(m.role === 'admin' ? 'member' : 'admin'); setActionMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors cursor-pointer">
                                <Shield className="w-3.5 h-3.5" /> Change Role
                              </button>
                            )}
                            {m.status === 'active' ? (
                              <button onClick={() => { setConfirmAction({ type: 'deactivate', userId: m.id, name: m.name }); setActionMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-warning hover:bg-bg-surface transition-colors cursor-pointer">
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                              </button>
                            ) : (
                              <button onClick={() => { handleStatusChange(m.id, 'active'); setActionMenuOpen(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-success hover:bg-bg-surface transition-colors cursor-pointer">
                                <UserCheck className="w-3.5 h-3.5" /> Reactivate
                              </button>
                            )}
                            <button onClick={() => { setConfirmAction({ type: 'remove', userId: m.id, name: m.name }); setActionMenuOpen(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-danger hover:bg-bg-surface transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">No members found</div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-warning" /> Pending Invitations ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-border">
                <div>
                  <div className="text-sm font-medium text-text-primary">{inv.email}</div>
                  <div className="text-xs text-text-muted">Role: {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleCancelInvite(inv.id)} className="text-xs text-danger hover:text-danger/80 font-semibold cursor-pointer">Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==== MODALS ==== */}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowInvite(false)}>
          <div className="bg-bg-elevated border border-border rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text-primary">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text-primary cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
                <input className="input" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
                <select className="select w-full" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="member">Member</option>
                  {myRole === 'owner' && <option value="admin">Admin</option>}
                </select>
              </div>
              <div className="p-3 rounded-xl bg-bg-secondary border border-border text-xs text-text-muted">
                {seats.used}/{seats.limit} seats used · {seats.limit - seats.used} remaining
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                <UserPlus className="w-4 h-4" /> {inviting ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowRoleModal(null)}>
          <div className="bg-bg-elevated border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4">Change Role — {showRoleModal.name}</h3>
            <select className="select w-full mb-4" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-end gap-3">
              <button className="btn" onClick={() => setShowRoleModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRoleChange}><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="bg-bg-elevated border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {confirmAction.type === 'deactivate' ? 'Deactivate' : 'Remove'} {confirmAction.name}?
            </h3>
            <p className="text-sm text-text-muted mb-6">
              {confirmAction.type === 'deactivate'
                ? 'This member will lose access to the workspace until reactivated.'
                : 'This member will be permanently removed from the workspace.'}
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="btn bg-danger/20 text-danger border-danger/30 hover:bg-danger/30"
                onClick={() => confirmAction.type === 'deactivate' ? handleStatusChange(confirmAction.userId, 'deactivated') : handleRemove(confirmAction.userId)}
              >
                {confirmAction.type === 'deactivate' ? 'Deactivate' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
