import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { DashboardKPI } from '@/types'
import * as Icons from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: string
  className?: string
  accentColor?: string
}

export function StatCard({ label, value, delta, deltaLabel, trend, icon, className, accentColor = 'text-violet-400' }: StatCardProps) {
  const IconComponent = icon ? (Icons as Record<string, any>)[icon] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5 group hover:border-zinc-700/80 transition-all',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        {IconComponent && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800/80', accentColor)}>
            <IconComponent className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold text-white tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="flex items-center gap-1.5 mt-2">
          {delta !== undefined && (
            <span className={cn(
              'text-xs font-semibold',
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-xs text-zinc-500">{deltaLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}

interface MetricGridProps {
  metrics: DashboardKPI[]
  columns?: 2 | 3 | 4 | 6
  accentColor?: string
  className?: string
}

export function MetricGrid({ metrics, columns = 4, accentColor, className }: MetricGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {metrics.map((m) => (
        <StatCard
          key={m.label}
          label={m.label}
          value={m.value}
          delta={m.delta}
          deltaLabel={m.deltaLabel}
          trend={m.trend}
          icon={m.icon}
          accentColor={accentColor}
        />
      ))}
    </div>
  )
}
