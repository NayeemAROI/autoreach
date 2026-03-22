import { cn } from '@/lib/utils'
import { AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AlertLevel } from '@/types'

interface AlertStripProps {
  level: AlertLevel
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  className?: string
}

const alertStyles: Record<AlertLevel, { bg: string; border: string; icon: typeof Info; iconColor: string }> = {
  info: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: Info, iconColor: 'text-blue-400' },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle, iconColor: 'text-amber-400' },
  error: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: XCircle, iconColor: 'text-red-400' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle, iconColor: 'text-red-500' },
}

export function AlertStrip({ level, title, message, actionLabel, onAction, onDismiss, className }: AlertStripProps) {
  const style = alertStyles[level]
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('rounded-xl border px-4 py-3 flex items-start gap-3', style.bg, style.border, className)}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', style.iconColor)} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-zinc-200">{title}</span>
        {message && <p className="text-xs text-zinc-500 mt-0.5">{message}</p>}
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors shrink-0">
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'primary'
  className?: string
}

export function QuickActionButton({ icon, label, onClick, variant = 'default', className }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        variant === 'primary'
          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20'
          : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white',
        className
      )}
    >
      {icon}
      {label}
    </button>
  )
}
