import { useState, ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'

// ─── SidebarNav ───
interface NavItem {
  label: string
  path: string
  icon: string
}

interface SidebarNavProps {
  items: NavItem[]
  brandName: string
  brandSubtitle?: string
  brandIcon: ReactNode
  collapsed?: boolean
  onToggleCollapse?: () => void
  footer?: ReactNode
  accentColor?: string
  className?: string
}

// Tailwind can't purge dynamic class names like `bg-${color}-500/10`, so we pre-map them
const ACCENT_MAP: Record<string, { activeBg: string; activeText: string; activeBorder: string }> = {
  violet: { activeBg: 'bg-violet-500/10', activeText: 'text-violet-400', activeBorder: 'border-violet-500/20' },
  amber: { activeBg: 'bg-amber-500/10', activeText: 'text-amber-400', activeBorder: 'border-amber-500/20' },
  blue: { activeBg: 'bg-blue-500/10', activeText: 'text-blue-400', activeBorder: 'border-blue-500/20' },
  emerald: { activeBg: 'bg-emerald-500/10', activeText: 'text-emerald-400', activeBorder: 'border-emerald-500/20' },
  rose: { activeBg: 'bg-rose-500/10', activeText: 'text-rose-400', activeBorder: 'border-rose-500/20' },
}

export function SidebarNav({ items, brandName, brandSubtitle, brandIcon, collapsed = false, onToggleCollapse, footer, accentColor = 'violet', className }: SidebarNavProps) {
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.violet

  return (
    <aside className={cn(
      'fixed left-0 top-0 bottom-0 flex flex-col bg-zinc-950 border-r border-zinc-800/60 z-40 transition-all duration-300',
      collapsed ? 'w-[68px]' : 'w-[260px]',
      className
    )}>
      {/* Brand */}
      <div className={cn('px-5 py-5 border-b border-zinc-800/60 flex items-center gap-3', collapsed && 'justify-center px-0')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">{brandIcon}</div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-white tracking-tight truncate">{brandName}</h1>
            {brandSubtitle && <p className="text-[10px] text-zinc-500 truncate">{brandSubtitle}</p>}
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const IconComp = (Icons as Record<string, any>)[item.icon] || Icons.Circle
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                collapsed && 'justify-center px-0',
                isActive
                  ? cn(accent.activeBg, accent.activeText, 'border', accent.activeBorder)
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <IconComp className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button onClick={onToggleCollapse} className="mx-3 mb-2 p-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900 transition-colors flex items-center justify-center">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Footer */}
      {footer && <div className="px-3 pb-4 border-t border-zinc-800/60 pt-3">{footer}</div>}
    </aside>
  )
}

// ─── TopBar ───
interface TopBarProps {
  children?: ReactNode
  className?: string
  sidebarWidth?: number
}

export function TopBar({ children, className, sidebarWidth = 260 }: TopBarProps) {
  return (
    <header
      className={cn('fixed top-0 right-0 h-[60px] bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/40 flex items-center justify-between px-6 z-30', className)}
      style={{ left: sidebarWidth }}
    >
      {children}
    </header>
  )
}

// ─── AppShell ───
interface AppShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
  sidebarWidth?: number
  className?: string
}

export function AppShell({ sidebar, topbar, children, sidebarWidth = 260, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {sidebar}
      {topbar}
      <main
        className={cn('pt-[60px] min-h-screen', className)}
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
