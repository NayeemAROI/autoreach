import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { ChevronDown, Plus, Check, Briefcase } from 'lucide-react'

export default function TopBar() {
  const { user, switchWorkspace, createWorkspace } = useAuth()
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creating, setCreating] = useState(false)
  const dropdownRef = useRef(null)

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
        className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm transition-all border
          ${wsDropdownOpen
            ? 'bg-primary/10 border-primary/20 text-primary'
            : 'bg-bg-elevated/60 border-border/60 text-text-secondary hover:border-primary/30 hover:text-text-primary'}`}
      >
        <Briefcase className="w-4 h-4" />
        <div className="flex flex-col items-start">
          <span className="font-medium max-w-[200px] truncate leading-tight">
            {activeWorkspace?.name || 'Workspace'}
          </span>
          <span className="flex items-center gap-1 text-[10px] leading-tight text-text-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${activeWorkspace?.linkedinConnected ? 'bg-success' : 'bg-success'}`} />
            Automation Active
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

        {/* Dropdown */}
        {wsDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-[280px] bg-bg-elevated border border-border/80 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in z-50">
            {/* Workspace List */}
            <div className="p-1.5 max-h-[250px] overflow-y-auto">
              {user?.workspaces?.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => {
                    if (ws.id !== user.activeWorkspaceId) {
                      switchWorkspace(ws.id)
                    }
                    setWsDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors
                    ${ws.id === user.activeWorkspaceId
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ws.linkedinConnected ? 'bg-success' : 'bg-text-muted/40'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ws.name}</p>
                    {ws.linkedinProfileName && (
                      <p className="text-[10px] text-text-muted truncate">{ws.linkedinProfileName}</p>
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
                <div className="flex items-center gap-1.5 p-1">
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
  )
}
