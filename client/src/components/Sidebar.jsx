import { NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'
import { 
  LayoutDashboard, 
  Users, 
  Rocket, 
  Mail, 
  BarChart3, 
  Settings, 
  Zap,
  ChevronRight,
  LogOut,
  CreditCard,
  Plug,
  ChevronDown,
  Plus,
  Linkedin,
  Check,
  Activity
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/campaigns', icon: Rocket, label: 'Campaigns' },
  { path: '/inbox', icon: Mail, label: 'Inbox' },
  { path: '/integrations', icon: Plug, label: 'Integrations' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/activity-log', icon: Activity, label: 'Activity Log' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/billing', icon: CreditCard, label: 'Billing' },
]

export default function Sidebar() {
  const { logout, user, switchWorkspace, createWorkspace } = useAuth();
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creating, setCreating] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setWsDropdownOpen(false)
        setShowCreateForm(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeWorkspace = user?.workspaces?.find(ws => ws.id === user?.activeWorkspaceId)
  
  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || creating) return
    setCreating(true)
    const result = await createWorkspace(newWsName.trim())
    setCreating(false)
    if (result.ok) {
      setNewWsName('')
      setShowCreateForm(false)
    }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-bg-secondary border-r border-border flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Outreach</h1>
            <p className="text-xs text-text-muted">Automation Suite</p>
          </div>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3 py-2.5 border-b border-border" ref={dropdownRef}>
        <button 
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all
            ${wsDropdownOpen 
              ? 'bg-primary/10 border border-primary/20' 
              : 'hover:bg-bg-hover border border-transparent'}`}
        >
          {/* LinkedIn status dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${activeWorkspace?.linkedinConnected ? 'bg-success' : 'bg-text-muted/40'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">
              {activeWorkspace?.name || 'Workspace'}
            </p>
            <p className="text-[10px] text-text-muted truncate">
              {activeWorkspace?.linkedinConnected 
                ? activeWorkspace.linkedinProfileName 
                : 'No LinkedIn connected'}
            </p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {wsDropdownOpen && (
          <div className="mt-1.5 bg-bg-elevated border border-border/80 rounded-xl shadow-xl shadow-black/30 overflow-hidden animate-fade-in">
            {/* Workspace List */}
            <div className="p-1.5 max-h-[200px] overflow-y-auto">
              {user?.workspaces?.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => {
                    if (ws.id !== user.activeWorkspaceId) {
                      switchWorkspace(ws.id)
                    }
                    setWsDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                    ${ws.id === user.activeWorkspaceId 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.linkedinConnected ? 'bg-success' : 'bg-text-muted/40'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ws.name}</p>
                    {ws.linkedinProfileName && (
                      <p className="text-[9px] text-text-muted truncate">{ws.linkedinProfileName}</p>
                    )}
                  </div>
                  {ws.id === user.activeWorkspaceId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-border/60 mx-2" />

            {/* Create Workspace */}
            <div className="p-1.5">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Workspace
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Workspace name..."
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateWorkspace()}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={creating || !newWsName.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
                  >
                    {creating ? '...' : 'Add'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-200 group relative
              ${isActive 
                ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary-light border border-primary/20' 
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'
              }
              ${item.badge ? 'opacity-60 pointer-events-none' : ''}
            `}
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[10px] font-semibold text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
            {!item.badge && (
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account User Info */}
      <div className="px-4 pb-4 space-y-3">
        <div className="glass-card p-3 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors" onClick={logout}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
               <span className="text-primary text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <div className="truncate text-left">
              <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-red-400 transition-colors shrink-0" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
