import { cn, formatRelativeTime } from '@/lib/utils'
import { motion } from 'framer-motion'

interface TimelineEvent {
  id: string
  icon?: React.ReactNode
  title: string
  subtitle?: string
  timestamp: string
  color?: string
}

interface ActivityTimelineProps {
  events: TimelineEvent[]
  className?: string
  maxItems?: number
}

export function ActivityTimeline({ events, className, maxItems }: ActivityTimelineProps) {
  const items = maxItems ? events.slice(0, maxItems) : events

  return (
    <div className={cn('space-y-0', className)}>
      {items.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex gap-3 py-3 relative"
        >
          {/* Line */}
          {i < items.length - 1 && (
            <div className="absolute left-[15px] top-[36px] w-px h-[calc(100%-24px)] bg-zinc-800" />
          )}
          {/* Dot */}
          <div className={cn('w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 bg-zinc-800/80 text-zinc-400 z-10', event.color && `text-${event.color}`)}>
            {event.icon || <div className="w-2 h-2 rounded-full bg-zinc-500" />}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 font-medium truncate">{event.title}</p>
            {event.subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{event.subtitle}</p>}
          </div>
          <span className="text-xs text-zinc-600 shrink-0">{formatRelativeTime(event.timestamp)}</span>
        </motion.div>
      ))}
    </div>
  )
}

interface InfoListProps {
  items: { label: string; value: React.ReactNode }[]
  className?: string
}

export function InfoList({ items, className }: InfoListProps) {
  return (
    <div className={cn('divide-y divide-zinc-800/60', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between py-3 px-1">
          <span className="text-xs text-zinc-500 font-medium">{item.label}</span>
          <span className="text-sm text-zinc-300">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
