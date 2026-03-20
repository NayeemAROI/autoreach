import { useState, useEffect } from 'react'
import {
  User, Shield, Bell, Briefcase, Save, Eye, EyeOff,
  Mail, Phone, MapPin, Clock, Linkedin, ShieldCheck, ShieldAlert, Calendar
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'workspace', label: 'Workspace', icon: Briefcase },
]

const TIMEZONES = [
  { value: 'UTC-8', label: 'Pacific Time (PT) — UTC-8' },
  { value: 'UTC-5', label: 'Eastern Time (ET) — UTC-5' },
  { value: 'UTC+0', label: 'London (GMT) — UTC+0' },
  { value: 'UTC+1', label: 'Central Europe (CET) — UTC+1' },
  { value: 'UTC+5.5', label: 'India (IST) — UTC+5.5' },
  { value: 'UTC+6', label: 'Dhaka (BST) — UTC+6' },
  { value: 'UTC+8', label: 'Singapore (SGT) — UTC+8' },
]

export default function Profile() {
  const { user: authUser } = useAuth()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    apiFetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data.user)
        setWorkspace(data.workspace)
        setPrefs(data.preferences)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          title: profile.title,
          timezone: profile.timezone,
        })
      })
      if (res.ok) showToast('Profile updated')
      else showToast('Failed to save', 'error')
    } catch { showToast('Error saving', 'error') }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) return showToast('Passwords do not match', 'error')
    if (newPw.length < 6) return showToast('Password must be at least 6 characters', 'error')
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Password changed!')
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
      } else {
        showToast(data.error || 'Failed', 'error')
      }
    } catch { showToast('Error', 'error') }
    setSaving(false)
  }

  const handleSavePrefs = async () => {
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      })
      if (res.ok) showToast('Preferences saved')
      else showToast('Failed', 'error')
    } catch { showToast('Error', 'error') }
    setSaving(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="glass-card h-20 shimmer"></div>
      <div className="glass-card h-80 shimmer"></div>
    </div>
  )

  const initials = profile?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const roleBadge = (role) => {
    const colors = {
      owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      member: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[role] || colors.member}`}>
        {role}
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl relative">
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
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg shadow-primary/25">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{profile?.name}</h1>
          <p className="text-sm text-text-muted flex items-center gap-2 mt-0.5">
            <Mail className="w-3.5 h-3.5" /> {profile?.email}
            <span className="mx-1">·</span>
            {roleBadge(workspace?.role || 'member')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              tab === t.id ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <input className="input" value={profile?.name || ''} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <input className="input opacity-60 cursor-not-allowed" value={profile?.email || ''} disabled />
              <p className="text-[10px] text-text-muted mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</label>
              <input className="input" placeholder="+880 1234567890" value={profile?.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Job Title</label>
              <input className="input" placeholder="CEO, Sales Lead..." value={profile?.title || ''} onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timezone</label>
              <select className="select w-full" value={profile?.timezone || 'UTC+6'} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
                {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Member Since</label>
              <input className="input opacity-60 cursor-not-allowed" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'} disabled />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="glass-card p-6 space-y-5 animate-fade-in max-w-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Change Password</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
              <div className="relative">
                <input type={showCurrentPw ? 'text' : 'password'} className="input pr-10" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} className="input pr-10" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" />
                <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
              <input type="password" className="input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-danger mt-1">Passwords don't match</p>}
            </div>
          </div>

          <div className="pt-2">
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving || !currentPw || !newPw || newPw !== confirmPw}>
              <Shield className="w-4 h-4" /> {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>

          {profile?.last_login_at && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-text-muted">Last login: {new Date(profile.last_login_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && prefs && (
        <div className="glass-card p-6 space-y-5 animate-fade-in max-w-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Notification Preferences</h2>
          </div>

          {[
            { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive important updates via email' },
            { key: 'campaign_notifications', label: 'Campaign Alerts', desc: 'Get notified about campaign events and milestones' },
            { key: 'inbox_notifications', label: 'Inbox/Reply Alerts', desc: 'Notifications when leads reply to your messages' },
            { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Receive a weekly performance digest' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border">
              <div>
                <div className="text-sm font-semibold text-text-primary">{item.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
              </div>
              <div
                className={`toggle ${prefs[item.key] ? 'active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
              ></div>
            </div>
          ))}

          <div className="pt-2 flex justify-end">
            <button className="btn btn-primary" onClick={handleSavePrefs} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Workspace Tab */}
      {tab === 'workspace' && workspace && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">{workspace.name}</h2>
                <p className="text-xs text-text-muted">Your workspace info</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-bg-secondary border border-border">
                <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Your Role</div>
                <div className="text-sm font-bold text-text-primary">{roleBadge(workspace.role)}</div>
              </div>
              <div className="p-3 rounded-xl bg-bg-secondary border border-border">
                <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Members</div>
                <div className="text-sm font-bold text-text-primary">{workspace.memberCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-bg-secondary border border-border">
                <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">LinkedIn</div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" />
                  <span className={workspace.linkedinConnected ? 'text-success' : 'text-text-muted'}>
                    {workspace.linkedinConnected ? workspace.linkedinProfileName : 'Not connected'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-bg-secondary border border-border">
                <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Joined</div>
                <div className="text-sm font-bold text-text-primary">
                  {workspace.joinedAt ? new Date(workspace.joinedAt).toLocaleDateString() : new Date(workspace.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
