import { useState, useEffect } from 'react'
import { Users, Shield, BarChart3, Key, Trash2, RefreshCw, Eye, EyeOff, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiFetch } from '../utils/api'
import ActivityLog from './ActivityLog'

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
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-10">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in ${
          toast.type === 'error' ? 'bg-danger text-white' : 'bg-success text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Admin Header with Special Gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-bg-surface to-bg-primary p-8">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Shield className="w-3.5 h-3.5" /> Super Admin Access
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Platform Control Center</h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl">
              You possess system-wide administrative privileges. Use these tools carefully to manage users, monitor platform health, and control global settings.
            </p>
          </div>
          <button onClick={fetchData} className="px-5 py-2.5 rounded-xl bg-bg-elevated border border-border/50 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover hover:border-border transition-all flex items-center gap-2 shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        </div>
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
            <div key={s.label} className="relative overflow-hidden rounded-xl bg-bg-surface border border-border/50 p-5 group hover:border-amber-500/30 transition-all shadow-sm">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-bg-elevated ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary">
                {s.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-bg-surface border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-bg-elevated/30 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Registered Users <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-bg-primary text-text-secondary border border-border ml-2">{users.length} Total</span>
          </h2>
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
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm shadow-sm">
                        {user.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary group-hover:text-amber-500 transition-colors">{user.name}</div>
                        <button onClick={() => copyToClipboard(user.id)} className="text-[10px] text-text-muted hover:text-amber-500 flex items-center gap-1 transition-colors" title="Click to copy ID">
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
                        className="p-2 rounded-lg text-text-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {user.email !== 'admin@autoreach.io' ? (
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="p-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest opacity-50 select-none">Admin</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Activity Log */}
      <div className="bg-bg-surface border border-border/50 rounded-xl overflow-hidden shadow-sm p-6">
        <ActivityLog isAdminView={true} />
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
              <button onClick={() => setResetModal(null)} className="flex-1 btn bg-bg-primary hover:bg-bg-hover text-text-primary border border-border">Cancel</button>
              <button 
                onClick={handleResetPassword} 
                disabled={!newPassword || newPassword.length < 6} 
                className="flex-1 btn bg-amber-500 hover:bg-amber-600 text-black border-none disabled:opacity-50 font-bold"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
