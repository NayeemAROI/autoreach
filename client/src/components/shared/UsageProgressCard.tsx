import { cn, usageWarningLevel, formatPercent } from '@/lib/utils'

interface UsageProgressCardProps {
  label: string
  used: number
  limit: number
  className?: string
}

export function UsageProgressCard({ label, used, limit, className }: UsageProgressCardProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const level = usageWarningLevel(used, limit)
  const barColor = { ok: 'bg-emerald-500', warn: 'bg-amber-500', critical: 'bg-red-500', exceeded: 'bg-red-600' }[level]

  return (
    <div className={cn('rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-medium text-zinc-500">{formatPercent(used, limit)}</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-white">{used.toLocaleString()}</span>
        <span className="text-xs text-zinc-500">of {limit.toLocaleString()}</span>
      </div>
    </div>
  )
}
