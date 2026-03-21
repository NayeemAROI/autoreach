import { useState, useEffect } from 'react'
import { Users, Shield, BarChart3, Key, Trash2, RefreshCw, Eye, EyeOff, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiFetch } from '../utils/api'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/stats')
      ])
      if (usersRes.status === 403) {
        setError('Admin access required. Only admin@autoreach.io can access this.')
        return
      }
      const usersData = await usersRes.json()
      const statsData = await statsRes.json()
      setUsers(usersData.users || [])
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword) return
    try {
      const res = await apiFetch(`/api/admin/users/${resetModal.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Password reset for ${resetModal.email}`)
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch {
      showToast('Error resetting password', 'error')
    } finally {
      setResetModal(null)
      setNewPassword('')
    }
  }

  const handleDelete = async (userId, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      showToast(`User ${email} deleted`)
      fetchData()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-danger opacity-50" />
          <p className="text-danger font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in ${
          toast.type === 'error' ? 'bg-danger text-white' : 'bg-success text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
        </div>
        <p className="text-sm text-text-muted mt-1">Manage users and view platform statistics</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Total Leads', value: stats.totalLeads, icon: BarChart3, color: 'text-info' },
            { label: 'Total Campaigns', value: stats.totalCampaigns, icon: BarChart3, color: 'text-accent' },
            { label: 'Active Campaigns', value: stats.activeCampaigns, icon: RefreshCw, color: 'text-success' },
          ].map(s => (
            <div key={s.label} className="glass-card p-5 border border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="text-3xl font-bold text-text-primary">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card border border-border/50">
        <div className="p-5 border-b border-border/40 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Registered Users ({users.length})
          </h2>
          <button onClick={fetchData} className="btn btn-sm btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-elevated/50">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">User</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Email</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Status</th>
                <th className="text-center px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Leads</th>
                <th className="text-center px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Campaigns</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Joined</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border/30 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-sm">
                        {user.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{user.name}</div>
                        <button onClick={() => copyToClipboard(user.id)} className="text-[10px] text-text-muted hover:text-primary flex items-center gap-1 transition-colors" title="Click to copy ID">
                          <Copy className="w-2.5 h-2.5" /> {user.id.substring(0, 8)}...
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-text-secondary">{user.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                      user.is_verified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.is_verified ? 'bg-success' : 'bg-warning'}`}></div>
                      {user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-text-primary">{user.leadCount}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-text-primary">{user.campaignCount}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-text-muted">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setResetModal(user)}
                        className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {user.email !== 'admin@autoreach.io' && (
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setResetModal(null)}>
          <div className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-1">Reset Password</h3>
            <p className="text-sm text-text-muted mb-4">Set a new password for <strong>{resetModal.email}</strong></p>
            <input
              type="text"
              placeholder="Enter new password..."
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary text-sm mb-4 focus:border-primary outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)} className="flex-1 btn btn-secondary">Cancel</button>
              <button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6} className="flex-1 btn btn-primary disabled:opacity-50">Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
