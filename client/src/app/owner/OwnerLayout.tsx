import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell, SidebarNav, TopBar } from '@/components/layout/AppShell'
import { OWNER_NAV } from '@/lib/constants'
import { Rocket, Search, Bell, ChevronDown, Plus, Upload, Linkedin, UserPlus } from 'lucide-react'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'

function OwnerSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <SidebarNav
      items={OWNER_NAV.map(n => ({ label: n.label, path: n.path, icon: n.icon }))}
      brandName="Autoreach"
      brandSubtitle="Sales Dashboard"
      brandIcon={
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
          <Rocket className="w-4.5 h-4.5 text-white" />
        </div>
      }
      collapsed={collapsed}
      onToggleCollapse={onToggle}
      accentColor="violet"
    />
  )
}

function OwnerTopbar({ sidebarWidth }: { sidebarWidth: number }) {
  const [search, setSearch] = useState('')

  return (
    <TopBar sidebarWidth={sidebarWidth}>
      <div className="flex items-center gap-3">
        {/* Workspace Switcher */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
          <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center text-violet-400 text-[10px] font-bold">A</div>
          <span className="font-medium">Autoreach Main</span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </button>
        <StatusBadge label="Business" variant="accent" dot={false} />
      </div>
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <div className="hidden lg:flex items-center gap-1.5 mr-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-violet-600/20">
            <Plus className="w-3.5 h-3.5" /> Campaign
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors">
            <Upload className="w-3 h-3" /> Import
          </button>
        </div>
        <button className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">NR</div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-zinc-300">Nayeemur Rahman</p>
            <p className="text-[10px] text-zinc-600">Owner</p>
          </div>
        </div>
      </div>
    </TopBar>
  )
}

export default function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 68 : 260

  return (
    <AppShell
      sidebar={<OwnerSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
      topbar={<OwnerTopbar sidebarWidth={sidebarWidth} />}
      sidebarWidth={sidebarWidth}
    >
      <Outlet />
    </AppShell>
  )
}
