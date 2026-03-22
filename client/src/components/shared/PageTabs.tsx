import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface PageTabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function PageTabs({ tabs, activeTab, onChange, className }: PageTabsProps) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-zinc-800/60 overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
              activeTab === tab.id ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'
            )}>
              {tab.count}
            </span>
          )}
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  )
}
