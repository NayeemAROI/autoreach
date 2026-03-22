import { cn } from '@/lib/utils'
import { BADGE_COLORS } from '@/lib/constants'
import type { BadgeVariant } from '@/lib/utils'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
  dot?: boolean
  className?: string
}

export function StatusBadge({ label, variant, dot = true, className }: StatusBadgeProps) {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.neutral
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', colors.bg, colors.text, className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />}
      {label}
    </span>
  )
}

interface HealthBadgeProps {
  health: 'operational' | 'degraded' | 'down' | 'unknown' | 'healthy' | 'stale' | 'expired' | 'warning' | 'critical'
  className?: string
}

const healthMap: Record<string, { label: string; variant: BadgeVariant }> = {
  operational: { label: 'Operational', variant: 'success' },
  healthy: { label: 'Healthy', variant: 'success' },
  degraded: { label: 'Degraded', variant: 'warning' },
  stale: { label: 'Stale', variant: 'warning' },
  warning: { label: 'Warning', variant: 'warning' },
  down: { label: 'Down', variant: 'danger' },
  expired: { label: 'Expired', variant: 'danger' },
  critical: { label: 'Critical', variant: 'danger' },
  unknown: { label: 'Unknown', variant: 'neutral' },
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  const { label, variant } = healthMap[health] || healthMap.unknown
  return <StatusBadge label={label} variant={variant} className={className} />
}
