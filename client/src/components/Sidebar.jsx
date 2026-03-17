import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  Users, 
  Rocket, 
  Mail, 
  BarChart3, 
  Settings, 
  Zap,
  ChevronRight,
  LogOut
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/campaigns', icon: Rocket, label: 'Campaigns' },
  { path: '/inbox', icon: Mail, label: 'Inbox', badge: 'Soon' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', badge: 'Soon' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { logout, user } = useAuth();
  
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-bg-secondary border-r border-border flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-border">
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

      {/* Account User Info & Health */}
      <div className="px-4 pb-4 space-y-3">
        {/* User Profile / Logout */}
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

        {/* Health */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-success pulse-dot"></div>
            <span className="text-xs font-semibold text-text-secondary">Node Status</span>
          </div>
          <div className="progress-bar mb-2">
            <div className="progress-fill" style={{ width: '100%' }}></div>
          </div>
          <div className="flex justify-between text-[11px] text-text-muted">
            <span>Local Backend</span>
            <span className="text-success font-semibold">Online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
