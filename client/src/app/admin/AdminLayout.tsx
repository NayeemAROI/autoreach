import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, SidebarNav, TopBar } from '@/components/layout/AppShell'
import { ADMIN_NAV } from '@/lib/constants'
import { Shield, Search, Bell, ChevronDown, Terminal, Zap } from 'lucide-react'
import { SearchInput } from '@/components/shared/SearchInput'

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <SidebarNav
      items={ADMIN_NAV.map(n => ({ label: n.label, path: n.path, icon: n.icon }))}
      brandName="Autoreach"
      brandSubtitle="Platform Admin"
      brandIcon={
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
      }
      collapsed={collapsed}
      onToggleCollapse={onToggle}
      accentColor="amber"
    />
  )
}

function AdminTopbar({ sidebarWidth }: { sidebarWidth: number }) {
  const [search, setSearch] = useState('')

  return (
    <TopBar sidebarWidth={sidebarWidth}>
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search platform..." className="w-72" />
      </div>
      <div className="flex items-center gap-2">
        {/* Environment Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
          <Terminal className="w-3 h-3" /> Production
        </span>
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </button>
        {/* Quick Actions */}
        <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors text-sm">
          <Zap className="w-3.5 h-3.5" /> Actions <ChevronDown className="w-3 h-3" />
        </button>
        {/* Profile */}
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">SA</div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-zinc-300">Super Admin</p>
            <p className="text-[10px] text-zinc-600">admin@autoreach.io</p>
          </div>
        </div>
      </div>
    </TopBar>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 68 : 260

  return (
    <AppShell
      sidebar={<AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
      topbar={<AdminTopbar sidebarWidth={sidebarWidth} />}
      sidebarWidth={sidebarWidth}
    >
      <Outlet />
    </AppShell>
  )
}
